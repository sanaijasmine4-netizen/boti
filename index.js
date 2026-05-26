

```js
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
        welcomeChannel: 'PUT_CHANNEL_ID_HERE',
        goodbyeChannel: 'PUT_CHANNEL_ID_HERE'
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

    // =========================
    // AUTORESPONDER
    // =========================

    for (const trigger in autoresponders) {

        if (message.content.toLowerCase().includes(trigger.toLowerCase())) {
            message.channel.send(autoresponders[trigger]);
        }
    }

    // =========================
    // AUTOREACTION
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

    // =========================
    // PREFIX CHECK
    // =========================

    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content
        .slice(config.prefix.length)
        .trim()
        .split(/ +/);

    const cmd = args.shift().toLowerCase();

    const isWhitelisted = whitelist.users.includes(message.author.id);

    // =========================
    // SET WELCOME CHANNEL
    // =========================

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

    // =========================
    // SET GOODBYE CHANNEL
    // =========================

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

    // =========================
    // SET PREFIX
    // =========================

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

    // =========================
    // WHITELIST ADD
    // =========================

    if (cmd === 'whitelistadd') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        }

        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Mention a user.');
        }

        if (!whitelist.users.includes(user.id)) {
            whitelist.users.push(user.id);
        }

        saveJSON('./data/whitelist.json', whitelist);

        message.reply(`${user.tag} added to whitelist.`);
    }

    // =========================
    // WHITELIST REMOVE
    // =========================

    if (cmd === 'whitelistremove') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        }

        const user = message.mentions.users.first();

        if (!user) {
            return message.reply('Mention a user.');
        }

        whitelist.users = whitelist.users.filter(id => id !== user.id);

        saveJSON('./data/whitelist.json', whitelist);

        message.reply(`${user.tag} removed from whitelist.`);
    }

    // =========================
    // ADD AUTORESPONSE
    // =========================

    if (cmd === 'addresponse') {

        if (!isWhitelisted) {
            return message.reply('Not whitelisted.');
        }

        const trigger = args.shift();
        const response = args.join(' ');

        if (!trigger || !response) {
            return message.reply('Usage: addresponse <trigger> <response>');
        }

        autoresponders[trigger] = response;

        saveJSON('./data/autoresponders.json', autoresponders);

        message.reply('Autoresponder added.');
    }

    // =========================
    // ADD AUTOREACTION
    // =========================

    if (cmd === 'addreaction') {

        if (!isWhitelisted) {
            return message.reply('Not whitelisted.');
        }

        const trigger = args[0];
        const emoji = args[1];

        if (!trigger || !emoji) {
            return message.reply('Usage: addreaction <trigger> <emoji>');
        }

        autoreactions[trigger] = emoji;

        saveJSON('./data/autoreactions.json', autoreactions);

        message.reply('Autoreaction added.');
    }

    // =========================
    // PROTECT ROLE
    // =========================

    if (cmd === 'protectrole') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        }

        const role = message.mentions.roles.first();

        if (!role) {
            return message.reply('Mention a role.');
        }

        secureRoles[role.id] = [];

        saveJSON('./data/secureRoles.json', secureRoles);

        message.reply(`${role.name} is now protected.`);
    }

    // =========================
    // ALLOW ROLE GIVER
    // =========================

    if (cmd === 'allowgiver') {

        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return;
        }

        const role = message.mentions.roles.first();
        const user = message.mentions.users.last();

        if (!role || !user) {
            return message.reply('Usage: allowgiver @role @user');
        }

        if (!secureRoles[role.id]) {
            secureRoles[role.id] = [];
        }

        if (!secureRoles[role.id].includes(user.id)) {
            secureRoles[role.id].push(user.id);
        }

        saveJSON('./data/secureRoles.json', secureRoles);

        message.reply(`${user.tag} can now give ${role.name}`);
    }

    // =========================
    // GIVE ROLE
    // =========================

    if (cmd === 'giverole') {

        const member = message.mentions.members.first();
        const role = message.mentions.roles.first();

        if (!member || !role) {
            return message.reply('Usage: giverole @user @role');
        }

        if (secureRoles[role.id]) {

            const allowedUsers = secureRoles[role.id];

            if (!allowedUsers.includes(message.author.id)) {
                return message.reply('You cannot give this role.');
            }
        }

        try {
            await member.roles.add(role);
            message.reply(`Role given to ${member.user.tag}`);
        } catch (err) {
            console.log(err);
            message.reply('Failed to give role.');
        }
    }

    // =========================
    // LEVEL COMMAND
    // =========================

    if (cmd === 'level') {

        message.reply(
            `Level: ${levels[message.author.id].level}
XP: ${levels[message.author.id].xp}`
        );
    }

    // =========================
    // HELP COMMAND
    // =========================

    if (cmd === 'help') {

        const embed = new EmbedBuilder()
            .setTitle('Commands')
            .setColor('Blue')
            .setDescription(`
${config.prefix}setwelcome #channel
${config.prefix}setgoodbye #channel
${config.prefix}setprefix <prefix>
${config.prefix}whitelistadd @user
${config.prefix}whitelistremove @user
${config.prefix}addresponse <trigger> <response>
${config.prefix}addreaction <trigger> <emoji>
${config.prefix}protectrole @role
${config.prefix}allowgiver @role @user
${config.prefix}giverole @user @role
${config.prefix}level
            `);

        message.channel.send({ embeds: [embed] });
    }
});
client.login(process.env.TOKEN);
```

# 3. Install Packages

Run this in terminal:

```bash
npm init -y
npm install discord.js dotenv
```

# 4. Start Bot

```bash
node index.js
```

# 5. Important

You ONLY need to manually add:

```txt
PUT_YOUR_BOT_TOKEN_HERE
```

Everything else can be managed directly inside Discord using commands.

Examples:

```txt
!setwelcome #welcome
!setgoodbye #goodbye
!setprefix ?
?whitelistadd @user
?addresponse hello Hey there!
```

# 6. Enable Intents

Enable these in Discord Developer Portal:

* MESSAGE CONTENT INTENT
* SERVER MEMBERS INTENT
* PRESENCE INTENT

# 7. Example Commands

```txt
!setprefix ?
?whitelistadd @user
?addresponse hello hey!
?addreaction hi 👋
?protectrole @Admin
?allowgiver @Admin @TrustedUser
?giverole @User @Admin
?level
```

# 11. Recommended Future Features

You can add:

* Slash commands
* MongoDB database
* Dashboard website
* Anti-nuke system
* Ticket system
* Moderation commands
* Music system
* Economy system
* Logging system
* Backup system
