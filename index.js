require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');

// =========================
// CREATE FILES
// =========================

if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

if (!fs.existsSync('./config.json')) {
    fs.writeFileSync('./config.json', JSON.stringify({
        prefix: '!',
        welcomeChannel: '',
        goodbyeChannel: ''
    }, null, 4));
}

if (!fs.existsSync('./data/levels.json')) {
    fs.writeFileSync('./data/levels.json', '{}');
}

if (!fs.existsSync('./data/autoresponders.json')) {
    fs.writeFileSync('./data/autoresponders.json', '{}');
}

if (!fs.existsSync('./data/autoreactions.json')) {
    fs.writeFileSync('./data/autoreactions.json', '{}');
}

// =========================
// FUNCTIONS
// =========================

function loadJSON(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function saveJSON(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 4));
}

// =========================
// LOAD DATA
// =========================

const config = loadJSON('./config.json');

let levels = loadJSON('./data/levels.json');
let autoresponders = loadJSON('./data/autoresponders.json');
let autoreactions = loadJSON('./data/autoreactions.json');

// =========================
// CLIENT
// =========================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ]
});

client.once('ready', () => {
    console.log(`${client.user.tag} is online`);
});

// =========================
// WELCOME
// =========================

client.on('guildMemberAdd', async member => {

    const channel = member.guild.channels.cache.get(config.welcomeChannel);

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setDescription(`welcome ${member} <3`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

// =========================
// GOODBYE
// =========================

client.on('guildMemberRemove', async member => {

    const channel = member.guild.channels.cache.get(config.goodbyeChannel);

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setColor('#2b2d31')
        .setDescription(`${member.user.tag} left`)
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

// =========================
// MESSAGE EVENT
// =========================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    // =========================
    // AUTORESPONSES
    // =========================

    for (const trigger in autoresponders) {

        if (message.content.toLowerCase().includes(trigger.toLowerCase())) {

            message.channel.send(autoresponders[trigger]);
        }
    }

    // =========================
    // AUTOREACTIONS
    // =========================

    for (const trigger in autoreactions) {

        if (message.content.toLowerCase().includes(trigger.toLowerCase())) {

            try {
                await message.react(autoreactions[trigger]);
            } catch (err) {}
        }
    }

    // =========================
    // LEVEL SYSTEM
    // =========================

    if (!levels[message.author.id]) {

        levels[message.author.id] = {
            xp: 0,
            level: 1
        };
    }

    levels[message.author.id].xp += 10;

    const neededXP = levels[message.author.id].level * 100;

    if (levels[message.author.id].xp >= neededXP) {

        levels[message.author.id].xp = 0;
        levels[message.author.id].level += 1;

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(
                `${message.author} leveled up to level ${levels[message.author.id].level}`
            );

        message.channel.send({ embeds: [embed] });
    }

    saveJSON('./data/levels.json', levels);

    // =========================
    // PREFIX
    // =========================

    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/);

    const cmd = args.shift().toLowerCase();

    // =========================
    // SETWELCOME
    // =========================

    if (cmd === 'setwelcome') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const channel = message.mentions.channels.first();

        if (!channel) {
            return message.reply('mention a channel');
        }

        config.welcomeChannel = channel.id;

        saveJSON('./config.json', config);

        message.reply(`welcome channel set to ${channel}`);
    }

    // =========================
    // SETGOODBYE
    // =========================

    if (cmd === 'setgoodbye') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const channel = message.mentions.channels.first();

        if (!channel) {
            return message.reply('mention a channel');
        }

        config.goodbyeChannel = channel.id;

        saveJSON('./config.json', config);

        message.reply(`goodbye channel set to ${channel}`);
    }

    // =========================
    // SETPREFIX
    // =========================

    if (cmd === 'setprefix') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const newPrefix = args[0];

        if (!newPrefix) {
            return message.reply('provide a prefix');
        }

        config.prefix = newPrefix;

        saveJSON('./config.json', config);

        message.reply(`prefix changed to ${newPrefix}`);
    }

    // =========================
    // ADD RESPONSE
    // =========================

    if (cmd === 'addresponse') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const trigger = args.shift()?.toLowerCase();
        const response = args.join(' ');

        if (!trigger || !response) {
            return message.reply(`usage: ${config.prefix}addresponse <trigger> <response>`);
        }

        autoresponders[trigger] = response;

        saveJSON('./data/autoresponders.json', autoresponders);

        message.reply(`added autoresponse for "${trigger}"`);
    }

    // =========================
    // REMOVE RESPONSE
    // =========================

    if (cmd === 'removeresponse') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const trigger = args[0]?.toLowerCase();

        if (!trigger) {
            return message.reply(`usage: ${config.prefix}removeresponse <trigger>`);
        }

        delete autoresponders[trigger];

        saveJSON('./data/autoresponders.json', autoresponders);

        message.reply(`removed autoresponse "${trigger}"`);
    }

    // =========================
    // RESPONSES
    // =========================

    if (cmd === 'responses') {

        const keys = Object.keys(autoresponders);

        if (!keys.length) {
            return message.reply('no autoresponses');
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('autoresponses')
            .setDescription(
                keys.map(k => `• ${k} → ${autoresponders[k]}`).join('\n')
            );

        message.channel.send({ embeds: [embed] });
    }

    // =========================
    // ADD REACTION
    // =========================

    if (cmd === 'addreaction') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const trigger = args[0]?.toLowerCase();
        const emoji = args[1];

        if (!trigger || !emoji) {
            return message.reply(`usage: ${config.prefix}addreaction <trigger> <emoji>`);
        }

        autoreactions[trigger] = emoji;

        saveJSON('./data/autoreactions.json', autoreactions);

        message.reply(`added reaction for "${trigger}"`);
    }

    // =========================
    // REMOVE REACTION
    // =========================

    if (cmd === 'removereaction') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const trigger = args[0]?.toLowerCase();

        if (!trigger) {
            return message.reply(`usage: ${config.prefix}removereaction <trigger>`);
        }

        delete autoreactions[trigger];

        saveJSON('./data/autoreactions.json', autoreactions);

        message.reply(`removed reaction "${trigger}"`);
    }

    // =========================
    // REACTIONS
    // =========================

    if (cmd === 'reactions') {

        const keys = Object.keys(autoreactions);

        if (!keys.length) {
            return message.reply('no autoreactions');
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('autoreactions')
            .setDescription(
                keys.map(k => `• ${k} → ${autoreactions[k]}`).join('\n')
            );

        message.channel.send({ embeds: [embed] });
    }

    // =========================
    // SIMPLE EMBED
    // =========================

    if (cmd === 'embed') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const text = args.join(' ');

        if (!text) {
            return message.reply(`usage: ${config.prefix}embed <message>`);
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(text)
            .setFooter({
                text: client.user.username
            })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // =========================
    // ADVANCED EMBED
    // =========================

    if (cmd === 'embed2') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('admin only');
        }

        const text = args.join(' ').split('|');

        const title = text[0]?.trim();
        const description = text[1]?.trim();

        if (!title || !description) {
            return message.reply(
                `usage: ${config.prefix}embed2 <title> | <description>`
            );
        }

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle(title)
            .setDescription(description)
            .setFooter({
                text: client.user.username
            })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    // =========================
    // LEVEL
    // =========================

    if (cmd === 'level') {

        message.reply(
`level: ${levels[message.author.id].level}
xp: ${levels[message.author.id].xp}`
        );
    }

    // =========================
    // HELP
    // =========================

    if (cmd === 'help') {

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setDescription(`
\`${config.prefix}setwelcome\`
\`${config.prefix}setgoodbye\`
\`${config.prefix}setprefix\`
\`${config.prefix}addresponse\`
\`${config.prefix}removeresponse\`
\`${config.prefix}responses\`
\`${config.prefix}addreaction\`
\`${config.prefix}removereaction\`
\`${config.prefix}reactions\`
\`${config.prefix}embed\`
\`${config.prefix}embed2\`
\`${config.prefix}level\`
`)
            .setFooter({
                text: client.user.username
            });

        message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
