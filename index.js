const {
    Client,
    GatewayIntentBits,
    ActivityType,
    EmbedBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    ChannelType,
    PermissionsBitField,
    SlashCommandBuilder,
    Routes,
    REST
} = require('discord.js');
const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running!");
});

app.listen(3000, () => {
  console.log("Uptime server running");
});


const fs = require('fs');
const path = require('path');
const discordTranscripts = require('discord-html-transcripts');

const Discord_Token = "MTUxMTQ4NDM3ODE4OTE0MDEzMg.Gk7mwa.HnvuGNxDsQgJd4qVXcEnC9Yjx4rgriI80Uwm4s";
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const OWNER_ID = [
    '1497456157575352411',
    '871896617458995282'
];

const TICKET_CATEGORY = '1395078511613706370';
const SUPPORT_ROLE_1 = '1402074259177865297';
const SUPPORT_ROLE_2 = '1435747716821946438';
const TRANSCRIPT_CHANNEL = '1511983556908290080';
const LEVEL_CHANNEL_ID = '1517312067625816214';

const LEVELS_FILE = path.join(__dirname, 'levels.json');

// Load or create levels file
let levels = {};
if (fs.existsSync(LEVELS_FILE)) {
    try {
        levels = JSON.parse(fs.readFileSync(LEVELS_FILE, 'utf8'));
    } catch {
        levels = {};
    }
}

function saveLevels() {
    fs.writeFileSync(LEVELS_FILE, JSON.stringify(levels, null, 2));
}

function getUserData(userId) {
    if (!levels[userId]) {
        levels[userId] = { level: 0, messages: 0 };
    }
    return levels[userId];
}

// Level requirement: +10 messages per level
function getRequiredMessages(level) {
    return (level + 1) * 10;
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const statuses = [
    '⭐️ Blakerslove Discord: .gg/VtrbabgyDr',
    '🛠️ Made By @wonderrlust_ on Discord'
];

let maintenanceMode = false;

/* -------------------------------------------------------------------------- */
/*                     REGISTER SLASH COMMANDS ON READY                       */
/* -------------------------------------------------------------------------- */

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('ping')
            .setDescription('Replies with Pong!'),

        new SlashCommandBuilder()
            .setName('say')
            .setDescription('Make the bot say something in a channel')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('Channel to send the message in')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('message')
                    .setDescription('Message to send')
                    .setRequired(true)
            ),

        new SlashCommandBuilder()
            .setName('level')
            .setDescription('Show your current level'),

        new SlashCommandBuilder()
            .setName('addlevel')
            .setDescription('Add levels to a user (Owner only)')
            .addUserOption(option =>
                option.setName('user')
                    .setDescription('User to modify')
                    .setRequired(true)
            )
            .addIntegerOption(option =>
                option.setName('amount')
                    .setDescription('Number of levels to add')
                    .setRequired(true)
            )
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(Discord_Token);

    try {
        console.log('Registering slash commands...');
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log('Slash commands registered.');
    } catch (err) {
        console.error(err);
    }

    /* --------------------------- STATUS ROTATION --------------------------- */

    let index = 0;

    const updateStatus = () => {
        if (maintenanceMode) return;

        client.user.setPresence({
            activities: [{ name: statuses[index], type: ActivityType.Custom }],
            status: 'online'
        });

        index = (index + 1) % statuses.length;
    };

    updateStatus();
    setInterval(() => { if (!maintenanceMode) updateStatus(); }, 30000);
});

/* -------------------------------------------------------------------------- */
/*                           SLASH COMMAND HANDLER                            */
/* -------------------------------------------------------------------------- */

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {

        // /ping
        if (interaction.commandName === 'ping') {
            return interaction.reply('🏓 Pong!');
        }

        // /say
        if (interaction.commandName === 'say') {
            if (!OWNER_ID.includes(interaction.user.id)) {
                return interaction.reply({ content: 'You cannot use this command.', ephemeral: true });
            }

            const channel = interaction.options.getChannel('channel');
            const messageText = interaction.options.getString('message');

            await channel.send(messageText);
            return interaction.reply({ content: `Message sent in ${channel}`, ephemeral: true });
        }

        // /level
        if (interaction.commandName === 'level') {
            const userData = getUserData(interaction.user.id);
            const required = userData.level >= 50 ? null : getRequiredMessages(userData.level);

            const embed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle(`Level for ${interaction.user.username}`)
                .setDescription(
                    userData.level >= 50
                        ? `You are level **50** (max level).`
                        : `Level: **${userData.level}**\nMessages: **${userData.messages}/${required}**`
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // /addlevel
        if (interaction.commandName === 'addlevel') {
            if (!OWNER_ID.includes(interaction.user.id)) {
                return interaction.reply({ content: 'You cannot use this command.', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');

            const userData = getUserData(targetUser.id);
            const oldLevel = userData.level;

            userData.level = Math.min(50, userData.level + amount);
            saveLevels();

            const embed = new EmbedBuilder()
                .setColor('#9b59b6')
                .setTitle('Level Updated')
                .setDescription(
                    `${targetUser} has been updated from **${oldLevel}** → **${userData.level}**`
                );

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }

    // Ticket button handler
    if (interaction.isButton()) {
        if (interaction.customId !== 'create_ticket') return;

        const ticketNumber = Math.floor(1000 + Math.random() * 9000);

        const channel = await interaction.guild.channels.create({
            name: `ticket-${ticketNumber}`,
            type: ChannelType.GuildText,
            parent: TICKET_CATEGORY,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]},
                { id: SUPPORT_ROLE_1, allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages
                ]},
                { id: SUPPORT_ROLE_2, allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages
                ]}
            ]
        });

        const welcome = new EmbedBuilder()
            .setColor('#FFF4A3')
            .setTitle('💛 Support Ticket')
            .setDescription('Welcome! Support will be with you shortly');

        await channel.send({ content: `<@${interaction.user.id}>`, embeds: [welcome] });

        await interaction.reply({
            content: `Your ticket has been created: ${channel}`,
            ephemeral: true
        });
    }
});

/* -------------------------------------------------------------------------- */
/*                           MESSAGE COMMAND HANDLER                          */
/* -------------------------------------------------------------------------- */

client.on('messageCreate', async message => {
    if (message.author.bot) return;

    // LEVEL SYSTEM
    const userData = getUserData(message.author.id);

    if (userData.level < 50) {
        userData.messages += 1;

        let leveledUp = false;
        let oldLevel = userData.level;

        while (userData.level < 50) {
            const required = getRequiredMessages(userData.level);
            if (userData.messages >= required) {
                userData.messages -= required;
                userData.level += 1;
                leveledUp = true;
            } else break;
        }

        if (leveledUp) {
            saveLevels();

            const levelChannel = client.channels.cache.get(LEVEL_CHANNEL_ID);
            if (levelChannel) {
                const embed = new EmbedBuilder()
                    .setColor('#9b59b6')
                    .setTitle('Congratulations!')
                    .setDescription(
                        `You have just levelled up from **${oldLevel}** → **${userData.level}!** 🎉`
                    );

                await levelChannel.send({
                    content: `<@${message.author.id}>`,
                    embeds: [embed]
                });
            }
        } else {
            saveLevels();
        }
    }

    // Legacy commands remain unchanged below
    // !say
    if (message.content.startsWith('!say ')) {
        if (!OWNER_ID.includes(message.author.id)) return;

        const args = message.content.split(' ');
        const targetChannel = message.mentions.channels.first();
        if (!targetChannel) return message.reply('Mention a channel.');

        const sayMessage = args.slice(2).join(' ');
        await message.delete().catch(() => {});
        await targetChannel.send(sayMessage);
    }

    // !role
    if (message.content.startsWith('!role ')) {
        if (!OWNER_ID.includes(message.author.id)) return;

        const args = message.content.trim().split(/\s+/);
        if (args.length !== 3) {
            return message.reply('Usage: !role <sourceRoleID> <targetRoleID>');
        }

        const sourceRoleID = args[1];
        const targetRoleID = args[2];

        const sourceRole = message.guild.roles.cache.get(sourceRoleID);
        const targetRole = message.guild.roles.cache.get(targetRoleID);

        if (!sourceRole) return message.reply(`❌ Source role not found: ${sourceRoleID}`);
        if (!targetRole) return message.reply(`❌ Target role not found: ${targetRoleID}`);

        await message.reply('⏳ Fetching members...');
        await message.guild.members.fetch();

        let checked = 0, added = 0, failed = 0;

        for (const member of message.guild.members.cache.values()) {
            if (member.roles.cache.has(sourceRoleID)) {
                checked++;
                if (!member.roles.cache.has(targetRoleID)) {
                    try {
                        await member.roles.add(targetRoleID);
                        added++;
                    } catch {
                        failed++;
                    }
                }
            }
        }

        message.channel.send(
            `✅ Finished!\n\nMembers with source role: ${checked}\nRoles added: ${added}\nFailed: ${failed}`
        );
    }

    // !ticketpanel
    if (message.content === '!ticketpanel') {
        if (!OWNER_ID.includes(message.author.id)) return;

        const embed = new EmbedBuilder()
            .setColor('#FFF4A3')
            .setTitle('💛 Blakerslove Support System')
            .setDescription(
`Use this channel to get in touch with our admins if you need support, assistance or you have any questions!

**Ticket Types:**
**Admin Support:** *Used for questions, concerns, issues and more!*`
            );

        const button = new ButtonBuilder()
            .setCustomId('create_ticket')
            .setLabel('💛 Create Ticket')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(button);

        await message.channel.send({ embeds: [embed], components: [row] });
    }

    // !maintenance
    if (message.content === '!maintenance') {
        if (!OWNER_ID.includes(message.author.id)) return;

        maintenanceMode = !maintenanceMode;

        if (maintenanceMode) {
            client.user.setPresence({
                activities: [{ name: '🛠️ Under Maintenance | Services Unavailable', type: ActivityType.Custom }],
                status: 'dnd'
            });

            return message.channel.send('🛠️ Maintenance mode enabled.');
        } else {
            return message.channel.send('✅ Maintenance mode disabled.');
        }
    }

    if (maintenanceMode && !OWNER_ID.includes(message.author.id)) {
        if (message.content.startsWith('!') || message.mentions.has(client.user)) {
            return message.reply('👷 This bot is under maintenance. Please check back later!');
        }
    }

    // !claim
    if (message.content === '!claim') {
        const support =
            message.member.roles.cache.has(SUPPORT_ROLE_1) ||
            message.member.roles.cache.has(SUPPORT_ROLE_2);

        if (!support) return;

        await message.channel.setName(
            `${message.member.user.username}-claimed`
                .toLowerCase()
                .replace(/[^a-z0-9-]/g, '')
        );

        const embed = new EmbedBuilder()
            .setColor('#FFF4A3')
            .setDescription(`${message.author} claimed the ticket!`);

        await message.channel.send({ embeds: [embed] });
    }

    // !close
    if (message.content === '!close') {
        await message.channel.send('❌ Ticket Closing..');
        await message.channel.send('📋 Transcript Saving..');

        const transcript = await discordTranscripts.createTranscript(
            message.channel,
            { filename: `${message.channel.name}.html` }
        );

        const logChannel = client.channels.cache.get(TRANSCRIPT_CHANNEL);
        if (logChannel) {
            await logChannel.send({
                content: `Transcript from ${message.channel.name}`,
                files: [transcript]
            });
        }

        await message.channel.send('📋 Transcript Saved..');
        await message.channel.send('💛 Closed!');

        setTimeout(async () => {
            await message.channel.delete().catch(() => {});
        }, 3000);
    }
});

client.login(Discord_Token);
