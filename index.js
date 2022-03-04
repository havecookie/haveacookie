// Packages
const { Client, Intents, MessageEmbed } = require('discord.js');
const fs = require('fs');
const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.DIRECT_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_MESSAGE_REACTIONS
    ],
    partials: ["CHANNEL"]
});
const CronJob = require('cron').CronJob;

// Config
const { token, emoji, maxPerDay, prefix, prizePurchaseAlertChannel, prizes } = require('./data/config.json');

// Listeners
client.on("ready", () => {

    // log
    console.log(`--> Bot online`);

    // reset daily
    let job = new CronJob('1 0 0 * * *', function() {

        // files
        files = fs.readdirSync(`./data/users/`).filter(t => t.endsWith(`.json`));
        for(i = 0; i < files.length; i++) {

            // load data
            data = JSON.parse(fs.readFileSync(`./data/users/${files[i]}`));

            // edit daily
            data.givenToday = 0;

            // write data
            fs.writeFileSync(`./data/users/${files[i]}`, JSON.stringify(data, null, 4));
        }

    }, null, true, 'America/New_York');
    job.start()
});
client.on("messageCreate", async message => {

    // filter
    if(message.author.bot) return;

    // variables
    msg = message.content.toLowerCase();
    md = message.content.split(" ");

    // leaderboards + personal stats
    if(message.mentions.users.first() && message.mentions.users.first().id == client.user.id) {

        // load all data
        data = [];
        fs.readdirSync(`./data/users/`).filter(t => t.endsWith(`.json`)).forEach(file => {
            data.push(JSON.parse(fs.readFileSync(`./data/users/${file}`)));
        });

        // user included?
        if(!data.filter(t => t.id == message.author.id)[0]) {
            data.push({ id: message.author.id, given: 0, received: 0, givenToday: 0 }); 
        }

        // received lb
        received = data.sort((a, b) => a.received > b.received ? -1 : 1).slice(0, 10);
        given = data.sort((a, b) => a.given > b.given ? -1 : 1).slice(0, 10);
        selfStats = data.filter(t => t.id == message.author.id)[0];

        // reply
        embed = new MessageEmbed()
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setColor('DARK_BLUE')
            .setTitle(`Leaderboard`)
            .addField(`Received`, `${received.length == 0 ? `No results to display` : `${received.map((t, i) => `${i+1}. <@${t.id}> - ${t.received} ${emoji}`).join("\n")}`}`)
            .addField(`Given`, `${given.length == 0 ? `No results to display` : `${given.map((t, i) => `${i+1}. <@${t.id}> - ${t.given} ${emoji}`).join("\n")}`}`)
            .setFooter({ text: `Gave ${selfStats.given} ${emoji} | Received ${selfStats.received} ${emoji}` })
        message.reply({ embeds: [embed] });

        // return
        return
    }

    // give tacos
    if(message.mentions.users.first() && message.mentions.users.first().id != message.author.id && message.content.includes(emoji)) {

        // fetch author data
        data = {
            "id": message.author.id,
            "given": 0,
            "received": 0,
            "givenToday": 0
        }
        if(fs.existsSync(`./data/users/${message.author.id}.json`)) data = JSON.parse(fs.readFileSync(`./data/users/${message.author.id}.json`));

        // cooldown?
        if(data.givenToday >= maxPerDay) {
            embed = new MessageEmbed()
                .setColor('DARK_RED')
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(`You can only send ${maxPerDay} ${emoji} per day!`)
            return message.reply({ embeds: [embed] });
        }

        // would this mention push them over?
        if(data.givenToday + message.mentions.users.size > maxPerDay) {
            embed = new MessageEmbed()
                .setColor('DARK_RED')
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(`You can only send ${maxPerDay} ${emoji} per day! Sending an additonal ${message.mentions.users.size} ${emoji} would exceed this.`)
            return message.reply({ embeds: [embed] });
        }

        // increment & save
        data.given += message.mentions.users.size;
        data.givenToday += message.mentions.users.size;
        fs.writeFileSync(`./data/users/${message.author.id}.json`, JSON.stringify(data, null, 4));

        // update mentioned users
        message.mentions.users.forEach(user => {
            if(fs.existsSync(`./data/users/${user.id}.json`)) {
                data = JSON.parse(fs.readFileSync(`./data/users/${user.id}.json`));
                data.received += 1;
                fs.writeFileSync(`./data/users/${user.id}.json`, JSON.stringify(data, null, 4));
            } else {
                fs.writeFileSync(`./data/users/${user.id}.json`, JSON.stringify({
                    "id": user.id,
                    "given": 0,
                    "received": 1,
                    "givenToday": 0
                }, null, 4));
            }
        });

        // react
        await message.react(emoji);
    }

    // buy rewards
    if(md[0].toLowerCase() == `${prefix}prizes`) {

        // item ID specified?
        if(!isNaN(md[1])) {

            // valid?
            if(md[1] < 1 || md[1] > prizes.length) {
                embed = new MessageEmbed()
                    .setColor('DARK_RED')
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setDescription(`Invalid item number!`)
                return message.reply({ embeds: [embed] });
            }

            // fetch item & data
            item = prizes[parseInt(md[1]) - 1];
            data = fs.existsSync(`./data/users/${message.author.id}.json`) ? JSON.parse(fs.readFileSync(`./data/users/${message.author.id}.json`)) : { "id": message.author.id, "given": 0, "received": 0, "givenToday": 0 };

            // afford?
            if(item.price > data.received) {
                embed = new MessageEmbed()
                    .setColor('DARK_RED')
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setDescription(`You do not have enough ${emoji} to purchase this prize!`)
                return message.reply({ embeds: [embed] });
            }

            // update json
            data.received -= item.price;
            fs.writeFileSync(`./data/users/${message.author.id}.json`, JSON.stringify(data, null, 4));

            // reply
            embed = new MessageEmbed()
                .setColor('GREEN')
                .setDescription(`Your purchase of **${item.name}** for **${item.price} ${emoji}** has been successful.`)
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setFooter({ text: `**${item.reedeemInstructions}**` })
            message.reply({ embeds: [embed] });
            
            // alert
            embed = new MessageEmbed()
                .setColor('DARK_BLUE')
                .setTitle(`Purchase Alert`)
                .addField(`Item`, item.name, true)
                .addField(`Price`, `${item.price} ${emoji}`, true)
                .setFooter({ text: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setTimestamp()
            c = await client.guilds.cache.first().channels.fetch(prizePurchaseAlertChannel);
            c.send({ embeds: [embed] });

            // return
            return
        }

        // display shop
        embed = new MessageEmbed()
            .setColor('DARK_BLUE')
            .setTitle(`Prizes`)
            .setDescription(prizes.map((t, i) => `${i + 1}. **${t.name}** (${t.price} ${emoji})\n${t.description}`).join("\n\n"))
            .setFooter({ text: `To purchase, type ${prefix}prizes <item number> (example: "!prizes 1")` })
        message.reply({ embeds: [embed] });
    }
});

// Login
client.login(token);
