const { Message } = require("discord.js");

/**
 *
 * @param {Message} msg
 * @param {string} userId
 */
function mentionsFirstUserId(msg, userId) {
    return msg.mentions.users.first() && msg.mentions.users.first().id == userId;
}

module.exports = { mentionsFirstUserId };
