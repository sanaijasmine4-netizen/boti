require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    PermissionsBitField,
    EmbedBuilder
} = require('discord.js');

const fs = require('fs');

// =========================
// AUTO CREATE FILES
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

if (!fs.existsSync('./data/whitelist.json')) {
    fs.writeFileSync('./data/whitelist.json', JSON.stringify({
        users: []
    }, null, 4));
}

if (!fs.existsSync('./data/autoresponders.json')) {
    fs.writeFileSync('./data/autoresponders.json', '{}');
}

if (!fs.existsSync('./data/autoreactions.json')) {
    fs.writeFileSync('./data/autoreactions.json', '{}');
}

if (!fs.existsSync('./data/secureRoles.json')) {
    fs.writeFileSync('./data/secureRoles.json', '{}');
}

function loadJSON(path) {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
}

function saveJSON(path, data) {
    fs.writeFileSync(path, JSON.stringify(data, null, 4));
}

const config = loadJSON('./config.json');

let levels = loadJSON('./data/levels.json');
let whitelist = loadJSON('./data/whitelist.json');
let autoresponders = loadJSON('./data/autoresponders.json');
let autoreactions = loadJSON('./data/autoreactions.json');
let secureRoles = loadJSON('./data/secureRoles.json');

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
    console.log(`${client.user.tag} is online!`);
});

// =========================
// WELCOME MESSAGE
// =========================

client.on('guildMemberAdd', async member => {

    const channel = member.guild.channels.cache.get(config.welcomeChannel);

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('Welcome!')
        .setDescription(`Welcome ${member} to the server!`)
        .setColor('Green')
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

// =========================
// GOODBYE MESSAGE
// =========================

client.on('guildMemberRemove', async member => {

    const channel = member.guild.channels.cache.get(config.goodbyeChannel);

    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle('Goodbye!')
        .setDescription(`${member.user.tag} left the server.`)
        .setColor('Red')
        .setTimestamp();

    channel.send({ embeds: [embed] });
});

// =========================
// MESSAGE EVENT
// =========================

client.on('messageCreate', async message => {

    if (message.author.bot) return;

    // AUTORESPONDER
    for (const trigger in autoresponders) {
        if (message.content.toLowerCase().includes(trigger.toLowerCase())) {
            message.channel.send(autoresponders[trigger]);
        }
    }

    // AUTOREACTION
    for (const trigger in autoreactions) {
        if (message.content.toLowerCase().includes(trigger.toLowerCase())) {
            try {
                await message.react(autoreactions[trigger]);
            } catch (err) {}
        }
    }

    // LEVEL SYSTEM
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

        message.channel.send(
            `${message.author} leveled up to level ${levels[message.author.id].level}!`
        );

        const levelRoleName = `Level ${levels[message.author.id].level}`;

        const role = message.guild.roles.cache.find(
            r => r.name === levelRoleName
        );

        if (role) {
            try {
                await message.member.roles.add(role);

                message.channel.send(
                    `${message.author} earned ${role.name}!`
                );

            } catch (err) {
                console.log(err);
            }
        }
    }

    saveJSON('./data/levels.json', levels);

    // PREFIX CHECK
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/);

    const cmd = args.shift().toLowerCase();

    const isWhitelisted = whitelist.users.includes(message.author.id);

    // SET WELCOME CHANNEL
    if (cmd === 'setwelcome') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Administrator only.');
        }

        const channel = message.mentions.channels.first();

        if (!channel) {
            return message.reply('Mention a channel.');
        }

        config.welcomeChannel = channel.id;

        saveJSON('./config.json', config);

        message.reply(`Welcome channel set to ${channel}`);
    }

    // SET GOODBYE CHANNEL
    if (cmd === 'setgoodbye') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Administrator only.');
        }

        const channel = message.mentions.channels.first();

        if (!channel) {
            return message.reply('Mention a channel.');
        }

        config.goodbyeChannel = channel.id;

        saveJSON('./config.json', config);

        message.reply(`Goodbye channel set to ${channel}`);
    }

    // SET PREFIX
    if (cmd === 'setprefix') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('Administrator only.');
        }

        const newPrefix = args[0];

        if (!newPrefix) {
            return message.reply('Provide a new prefix.');
        }

        config.prefix = newPrefix;

        saveJSON('./config.json', config);

        message.reply(`Prefix changed to ${newPrefix}`);
    }

    // LEVEL COMMAND
    if (cmd === 'level') {

        message.reply(
`Level: ${levels[message.author.id].level}
XP: ${levels[message.author.id].xp}`
        );
    }

    // HELP COMMAND
    if (cmd === 'help') {

        const embed = new EmbedBuilder()
            .setTitle('Commands')
            .setColor('Blue')
            .setDescription(`
${config.prefix}setwelcome #channel
${config.prefix}setgoodbye #channel
${config.prefix}setprefix <prefix>
${config.prefix}level
`);

        message.channel.send({ embeds: [embed] });
    }
});

client.login(process.env.TOKEN);
