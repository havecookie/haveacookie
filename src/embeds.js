const { MessageEmbed, User } = require("discord.js");

const noResultsMsg = "No results to display";

/**
 *
 * @param {User} author
 * @param {string} emoji
 * @returns {MessageEmbed}
 */
function buildInsufficientCookieEmbed(author, emoji) {
    return new MessageEmbed({
        color: "DARK_RED",
        author: {
            name: author.tag,
            iconURL: author.displayAvatarURL(),
        },
        description: `You do not have enough ${emoji} to purchase this prize!`,
    });
}

/**
 *
 * @param {User} author
 * @returns {MessageEmbed}
 */
function buildInvalidItemEmbed(author) {
    return new MessageEmbed({
        color: "DARK_RED",
        author: {
            name: author.tag,
            iconURL: author.displayAvatarURL(),
        },
        description: "Invalid item number!",
    });
}

/**
 *
 * @param {User} author
 * @param {string} emoji
 * @returns {MessageEmbed}
 */
function buildLeaderboardEmbed(author, emoji, boardData) {
    return new MessageEmbed({
        footer: { text: `Gave ${boardData.selfStat.given_count} ${emoji} | Received ${boardData.selfStat.received_count} ${emoji}` },
        title: "Leaderboard",
        color: "DARK_BLUE",
        author: {
            name: author.tag,
            iconURL: author.displayAvatarURL(),
        },
    }).addFields([
        {
            name: "Received",
            value:
                boardData.received.length === 0
                    ? noResultsMsg
                    : boardData.received.map((t, i) => `${i + 1}. <@${t.id}> - ${t.received_count} ${emoji}`).join("\n"),
        },
        {
            name: "Given",
            value: boardData.given.length === 0 ? noResultsMsg : boardData.given.map((t, i) => `${i + 1}. <@${t.id}> - ${t.given_count} ${emoji}`).join("\n"),
        },
    ]);
}

/**
 *
 * @param {User} author
 * @param {string} emoji
 * @param {number} maxPerDay
 * @param {number | null} sendAttemptSize
 * @returns {MessageEmbed}
 */
function buildCookieCooldownEmbed(author, emoji, maxPerDay, sendAttemptSize = null) {
    let descString = `You can only send ${maxPerDay} ${emoji} per day!`;

    if (sendAttemptSize) {
        descString = `${descString} Sending an additional ${sendAttemptSize} ${emoji} would exceed this.`;
    }

    return new MessageEmbed({
        color: "DARK_RED",
        author: {
            name: author.tag,
            iconURL: author.displayAvatarURL(),
        },
        description: descString,
    });
}

/**
 * @param {string} prefix
 * @param {string} emoji
 * @param {object[]} prizes
 * @returns {MessageEmbed}
 */
function buildShopEmbed(prefix, emoji, prizes) {
    return new MessageEmbed()
        .setColor("DARK_BLUE")
        .setTitle(`Prizes`)
        .setDescription(prizes.map((t, i) => `${i + 1}. **${t.name}** (${t.price} ${emoji})\n${t.description}`).join("\n\n"))
        .setFooter({ text: `To purchase, type ${prefix}prizes <item number> (example: "!prizes 1")` });
}

/**
 * @param {User} author
 * @param {*} item
 * @param {string} emoji
 * @returns {MessageEmbed}
 */
function buildPurchaseEmbed(author, item, emoji) {
    return new MessageEmbed({
        color : 'GREEN',
        description : `Your purchase of **${item.name}** for **${item.price} ${emoji}** has been successful.`,
        author: {
            name: author.tag,
            iconURL: author.displayAvatarURL(),
        },
        footer : { text: `**${item.redeemInstructions}**` }
    })    
}

/**
 * @param {User} author
 * @param {*} item
 * @returns {MessageEmbed}
 */
function buildPurchaseAlertEmbed(author, item, emoji){
    return new MessageEmbed({
        color : 'DARK_BLUE',
        title : 'Purchase Alert',
        fields : [
            {value : item.name, inline: true, name : 'Item'},
            {value : `${item.price}${emoji}`, inline: true, name : 'Price'}
        ],
        footer : {text : author.tag, iconURL : author.displayAvatarURL()}
    })
}

module.exports = { buildPurchaseEmbed, buildPurchaseAlertEmbed, buildShopEmbed, buildInvalidItemEmbed, buildCookieCooldownEmbed, buildLeaderboardEmbed, buildInsufficientCookieEmbed };
