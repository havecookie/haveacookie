const config = require("../config.json");

const logger = require("pino")({
    transport: {
        target: "pino-pretty",
    },
});

const { utcToZonedTime } = require("date-fns-tz");

const { Client, Intents, MessageEmbed, Message } = require("discord.js");
const { mentionsFirstUserId } = require("./helper");
const { CUserCookie, queryLeaderboards, getBalance } = require("./model");
const { buildCookieCooldownEmbed, buildLeaderboardEmbed, buildInvalidItemEmbed, buildInsufficientCookieEmbed, buildShopEmbed, buildPurchaseEmbed, buildPurchaseAlertEmbed } = require("./embeds");

const bot = new Client({
    intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
    partials: ["CHANNEL"],
});

const resetTz = "America/New_York";

bot.on("ready", () => {
    logger.info("Bot Online");
});

bot.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    // Send leaderboard + personal stat on user mentioning bot
    if (mentionsFirstUserId(msg, bot.user.id)) {
        let boardData = await queryLeaderboards(msg.author.id);
        let embed = buildLeaderboardEmbed(msg.author, config.emoji, boardData);

        return msg.reply({ embeds: [embed] });
    }

    // Give Tacos on mention of another member with emoji
    if (msg.mentions.users.first() && msg.mentions.users.first().id !== msg.author.id && msg.content.includes(config.emoji)) {
        let todayOnTz = utcToZonedTime(new Date(), resetTz);

        let data = await CUserCookie.findAll({
            where: {
                given_by: msg.author.id,
                given_date: todayOnTz,
            },
        });

        // Cooldown limit on one user
        if (data.length >= config.maxPerDay) {
            let embed = buildCookieCooldownEmbed(msg.author, config.emoji, config.maxPerDay);

            return msg.reply({ embeds: [embed] });
        }

        // Cooldown limit on multiple mention
        if (data.length + msg.mentions.users.size > config.maxPerDay) {
            let embed = buildCookieCooldownEmbed(msg.author, config.emoji, config.maxPerDay, msg.mentions.users.size);

            return msg.reply({ embeds: [embed] });
        }

        // Creates
        await CUserCookie.bulkCreate(
            msg.mentions.users.map((user) => {
                return {
                    given_by: msg.author.id,
                    given_date: todayOnTz,
                    given_to: user.id,
                    is_given: true,
                    is_transaction: false,
                };
            })
        );

        return await msg.react(config.emoji);
    }

    if (!msg.content.startsWith(config.prefix)) return;

    let splitted = msg.content.split(" ");
    let cmd = splitted[0].substring(config.prefix.length).toLowerCase();
    let args = splitted.slice(1)

    if (cmd === "prizes") {
        // Display shop on no arg
        if (args.length === 0) return await msg.reply({ embeds: [buildShopEmbed(config.prefix, config.emoji, config.prizes)] });

        // Purchase item?
        let chosenIdx = args[0];

        if (isNaN(chosenIdx)) return;

        if (chosenIdx < 1 || chosenIdx > config.prizes.length) return await msg.reply({ embeds: [buildInvalidItemEmbed(msg.author)] });

        let chosenItem = config.prizes[parseInt(chosenIdx) - 1];
        let currentBalance = await getBalance(msg.author.id);

        if (chosenItem.price > currentBalance) return await msg.reply({ embeds: [buildInsufficientCookieEmbed(msg.author, config.emoji)] });

        await CUserCookie.create({
            given_by: null,
            given_date: null,
            given_to: msg.author.id,
            value : chosenItem.price * -1,
            is_given: false,
            is_transaction: true,
            item_name: chosenItem.name
        })

        // Send reply
        await msg.reply({embeds : [buildPurchaseEmbed(msg.author, chosenItem, config.emoji)]})

        // Send alert
        let alertChannel = await bot.guilds.cache.find(e => e.id === msg.guildId).channels.fetch(config.prizePurchaseAlertChannel)

        return await alertChannel.send({ embeds : [buildPurchaseAlertEmbed(msg.author, chosenItem, config.emoji)] })
    }
});

(async () => {
    // Syncs database schema
    await CUserCookie.sync();

    bot.login(config.token);
})();
