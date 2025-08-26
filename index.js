const { Client, GatewayIntentBits, SlashCommandBuilder, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// =================== DATABASE FUNCTIONS ===================
const DB_PATH = path.join(__dirname, 'userdata.json');
let userBalances = {};

function loadDatabase() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const data = fs.readFileSync(DB_PATH, 'utf8');
            userBalances = JSON.parse(data);
            console.log('Database loaded successfully');
        } else {
            console.log('No existing database found, starting with empty data');
            userBalances = {};
        }
    } catch (error) {
        console.error('Error loading database:', error);
        userBalances = {};
    }
}

function saveDatabase() {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(userBalances, null, 2));
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

function getUserBalance(userId) {
    if (!(userId in userBalances)) {
        userBalances[userId] = 0;
        saveDatabase();
    }
    return userBalances[userId];
}

function addUserMoney(userId, amount) {
    const currentBalance = getUserBalance(userId);
    const newBalance = currentBalance + amount;
    userBalances[userId] = newBalance;
    saveDatabase();
    return newBalance;
}

function removeUserMoney(userId, amount) {
    const currentBalance = getUserBalance(userId);
    const newBalance = Math.max(0, currentBalance - amount);
    userBalances[userId] = newBalance;
    saveDatabase();
    return newBalance;
}

// =================== PERMISSION FUNCTIONS ===================
function hasStaffRole(member) {
    if (!member || !member.roles) {
        return false;
    }
    const staffRole = member.roles.cache.find(role => role.name === 'Staff 👷‍♂️');
    return !!staffRole;
}

// =================== BOT SETUP ===================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

// =================== COMMAND DEFINITIONS ===================

// UserProfile Command
const userProfileCommand = {
    data: new SlashCommandBuilder()
        .setName('userprofile')
        .setDescription('Check your current balance'),
    
    async execute(interaction) {
        try {
            const userId = interaction.user.id;
            const balance = getUserBalance(userId);
            const formattedBalance = `$${balance.toLocaleString()}`;
            
            await interaction.reply({
                content: `💰 **Your Balance:** ${formattedBalance}`,
                ephemeral: true
            });
        } catch (error) {
            console.error('Error in userprofile command:', error);
            await interaction.reply({
                content: '❌ There was an error retrieving your profile. Please try again later.',
                ephemeral: true
            });
        }
    }
};

// AddMoney Command
const addMoneyCommand = {
    data: new SlashCommandBuilder()
        .setName('addmoney')
        .setDescription('Add money to a user\'s account (Staff only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add money to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of money to add')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction) {
        try {
            if (!hasStaffRole(interaction.member)) {
                await interaction.reply({
                    content: '❌ **Access Denied:** You need the "Staff 👷‍♂️" role to use this command.',
                    ephemeral: true
                });
                return;
            }

            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            
            if (amount <= 0) {
                await interaction.reply({
                    content: '❌ **Invalid Amount:** Please enter a positive number.',
                    ephemeral: true
                });
                return;
            }

            const newBalance = addUserMoney(targetUser.id, amount);
            const formattedAmount = `$${amount.toLocaleString()}`;
            const formattedNewBalance = `$${newBalance.toLocaleString()}`;
            
            await interaction.reply({
                content: `💰 **Money Added Successfully!**\n` +
                        `👤 **User:** ${targetUser.displayName || targetUser.username}\n` +
                        `➕ **Amount Added:** ${formattedAmount}\n` +
                        `💳 **New Balance:** ${formattedNewBalance}\n` +
                        `👷‍♂️ **Added by:** ${interaction.user.displayName || interaction.user.username}`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error in addmoney command:', error);
            await interaction.reply({
                content: '❌ There was an error processing the transaction. Please try again later.',
                ephemeral: true
            });
        }
    }
};

// RemoveMoney Command
const removeMoneyCommand = {
    data: new SlashCommandBuilder()
        .setName('removemoney')
        .setDescription('Remove money from a user\'s account (Staff only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove money from')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of money to remove')
                .setRequired(true)
                .setMinValue(1)),
    
    async execute(interaction) {
        try {
            if (!hasStaffRole(interaction.member)) {
                await interaction.reply({
                    content: '❌ **Access Denied:** You need the "Staff 👷‍♂️" role to use this command.',
                    ephemeral: true
                });
                return;
            }

            const targetUser = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            
            if (amount <= 0) {
                await interaction.reply({
                    content: '❌ **Invalid Amount:** Please enter a positive number.',
                    ephemeral: true
                });
                return;
            }

            const currentBalance = getUserBalance(targetUser.id);
            
            if (currentBalance < amount) {
                await interaction.reply({
                    content: `❌ **Insufficient Funds:** ${targetUser.displayName || targetUser.username} only has $${currentBalance.toLocaleString()}, but you're trying to remove $${amount.toLocaleString()}.`,
                    ephemeral: true
                });
                return;
            }
            
            const newBalance = removeUserMoney(targetUser.id, amount);
            const formattedAmount = `$${amount.toLocaleString()}`;
            const formattedNewBalance = `$${newBalance.toLocaleString()}`;
            
            await interaction.reply({
                content: `💸 **Money Removed Successfully!**\n` +
                        `👤 **User:** ${targetUser.displayName || targetUser.username}\n` +
                        `➖ **Amount Removed:** ${formattedAmount}\n` +
                        `💳 **New Balance:** ${formattedNewBalance}\n` +
                        `👷‍♂️ **Removed by:** ${interaction.user.displayName || interaction.user.username}`,
                ephemeral: false
            });
        } catch (error) {
            console.error('Error in removemoney command:', error);
            await interaction.reply({
                content: '❌ There was an error processing the transaction. Please try again later.',
                ephemeral: true
            });
        }
    }
};

// =================== REGISTER COMMANDS ===================
client.commands.set(userProfileCommand.data.name, userProfileCommand);
client.commands.set(addMoneyCommand.data.name, addMoneyCommand);
client.commands.set(removeMoneyCommand.data.name, removeMoneyCommand);

// =================== BOT EVENT HANDLERS ===================
client.once('ready', async () => {
    console.log(`Ready! Logged in as ${client.user.tag}`);
    console.log(`Bot is active in ${client.guilds.cache.size} servers`);
    
    // Deploy slash commands globally
    try {
        console.log('Deploying slash commands...');
        const commands = [
            userProfileCommand.data.toJSON(),
            addMoneyCommand.data.toJSON(),
            removeMoneyCommand.data.toJSON()
        ];
        
        await client.application.commands.set(commands);
        console.log('✅ Slash commands deployed successfully!');
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error('Error executing command:', error);
        
        const errorMessage = 'There was an error while executing this command!';
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: errorMessage, ephemeral: true });
        } else {
            await interaction.reply({ content: errorMessage, ephemeral: true });
        }
    }
});

client.on('error', error => {
    console.error('Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('Unhandled promise rejection:', error);
});

// =================== INITIALIZE ===================
loadDatabase();

// Auto-save every 5 minutes
setInterval(() => {
    saveDatabase();
}, 5 * 60 * 1000);

// Login to Discord
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('DISCORD_TOKEN environment variable is required!');
    process.exit(1);
}

client.login(token);