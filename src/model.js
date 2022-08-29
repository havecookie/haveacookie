const { Sequelize, DataTypes, QueryTypes } = require("sequelize");
const config = require("../config.json");

const sequelize = new Sequelize(config.databaseUrl);

const CUserCookie = sequelize.define(
    "CUserCookieTransaction",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        is_given: {
            type: DataTypes.BOOLEAN,
        },
        is_transaction: {
            type: DataTypes.BOOLEAN,
        },
        item_name: {
            type: DataTypes.STRING,
        },
        value: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
        },
        given_by: {
            allowNull: true,
            type: DataTypes.STRING,
        },
        given_date: {
            allowNull: true,
            type: DataTypes.DATEONLY,
        },
        given_to: {
            type: DataTypes.STRING,
        },
    },
    {
        tableName: "c_user_cookie_transactions",
    }
);

/**
 *
 * @param {string} selfUserId
 */
async function getBalance(selfUserId) {
    const givenRank = await sequelize.query(`select sum(value) as res from c_user_cookie_transactions where given_to = ?`, {
        type: QueryTypes.SELECT,
        replacements: [selfUserId],
    });

    return givenRank.length == 0 ? 0 : givenRank[0]["res"];
}

/**
 *
 * @param {string} selfUserId
 * @param {number} limit
 */
async function queryLeaderboards(selfUserId, limit = 10) {
    const givenRanking = await sequelize.query(
        `select given_by as id, count(given_by) as given_count from c_user_cookie_transactions where is_transaction = false group by given_by order by given_count desc LIMIT ${limit};`,
        { type: QueryTypes.SELECT }
    );
    const receivedRanking = await sequelize.query(
        `select given_to as id, count(given_to) as received_count from c_user_cookie_transactions where is_given = true group by given_to order by received_count desc LIMIT ${limit};`,
        { type: QueryTypes.SELECT }
    );

    let selfStat = await sequelize.query(
        `select (select count(*) from c_user_cookie_transactions where given_by = ?) as given_count, 
    (select count(*) from c_user_cookie_transactions where given_to = ? AND is_given = ?) as received_count`,
        {
            replacements: [selfUserId, selfUserId, true],
            type: QueryTypes.SELECT,
        }
    );

    selfStat = selfStat.length === 1 ? selfStat[0] : { given_count: 0, received_count: 0 };

    return { given: givenRanking, received: receivedRanking, selfStat: selfStat };
}

module.exports = { CUserCookie, queryLeaderboards, getBalance };
