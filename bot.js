const tmi = require('tmi.js');
require('dotenv').config();

// Define configuration options
const opts = {
    identity: {
        username: 'nauseousbro',
        password: 'oauth:' + process.env.OATH_TOKEN
    },
    channels: process.env.SELECTED_CHANNELS.split(',')
};

// Create a client with our options
const client = new tmi.client(opts);
const fetch = require('node-fetch');

const wavPlayer = require('node-wav-player');

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();


//Import Sounds
const handleSoundCommands = require('./sounds.js');

//Replicate AI
const Replicate = require("replicate");

const replicate = new Replicate({
    auth: process.env.REP_AUTH,
});

//API caller for followage
const axios = require('axios');



//Database

const sqlite3 = require('sqlite3').verbose();

let db = new sqlite3.Database('./quotes.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the quotes database.');
});

db.run('CREATE TABLE IF NOT EXISTS quotes(quote TEXT)', (err) => {
    if (err) {
        console.error(err.message);
    }
});


// Mapping from common abbreviations to CoinGecko ids
const cryptoIds = {
    btc: 'bitcoin',
    eth: 'ethereum',
    sol: 'solana',
    doge: 'dogecoin',
    usdt: 'tether',
    xrp: 'ripple',
};

let quotes = [];

// Called every time a message comes in
async function onMessageHandler(target, context, msg, self) {
    if (self) { return; } // Ignore messages from the bot

    // Remove whitespace from chat message
    const parts = msg.trim().split(" ");
    const mention = parts[0].toLowerCase();
    const commandName = parts[1];
    const argument = parts[2];
    const user = '@' + client.getUsername().toLowerCase();

    console.log(msg);

    // If the command is known, let's execute it
    if (mention === user && commandName === 'crypto') {
        if (!argument) {
            client.say(target, `You must provide a cryptocurrency.`);
            return;
        }
        const id = cryptoIds[argument.toLowerCase()];
        if (!id) {
            client.say(target, `${argument.toUpperCase()} is not a valid input.`);
            return;
        }
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`);
        const data = await response.json();
        if (response.ok) {
            if (data[id]) {
                const price = data[id].usd;
                client.say(target, `${argument.toUpperCase()}: $${price}`);
            } else {
                client.say(target, `${argument.toUpperCase()} is not a valid input.`);
            }
        } else {
            client.say(target, `Could not fetch the price for ${argument.toUpperCase()}.`);
        }
        console.log(`* Executed ${commandName} command`);
    }
    else if (mention === user && commandName === 'ping') {
        client.say(target, 'Pong!');
        console.log(`* Executed ${commandName} command`);

    }
    else if (mention === user && commandName === 'dice') {
        const num = rollDice();
        client.say(target, `You rolled a ${num}`);
        console.log(`* Executed ${commandName} command`);
    }

    else if (mention === user && commandName === 'guess') {
        const num = rollDice();
        if (argument == num) {
            client.say(target, `You guessed correctly!`);
        }

        /*Code to check if argument is empty or has letters */
        else if (argument === undefined || /[a-zA-Z]/.test(argument)) {
            client.say(target, `You must provide a number.`);
        }
        else {
            console.log(argument)
            client.say(target, `You guessed incorrectly! The number was ${num}.`);
        }
        console.log(`* Executed ${commandName} command`);
    }

    else if (mention === user && commandName === 'shoutout' || mention === user && commandName === 'so') {

        if (!argument) {
            client.say(target, `You must provide a user.`);
            return;
        }
        if (argument.startsWith('@')) {
            username = argument.slice(1);
        }

        if (context.username === 'nauseouswave') {
            client.say(target, `Check out ${argument} at https://twitch.tv/${username.toLowerCase()} <3`);
        } else {
            client.say(target, `Only the streamer can do shoutouts.`);
            return;
        }

        console.log(`* Executed ${commandName} command`);
    }

    else if (mention === user && commandName === 'discord') {
        client.say(target, `Join the discord! ${process.env.DISCORD}`)
    }

    else if (mention === user && (commandName === 'sfx' || commandName === 'sounds')) {
        const soundName = parts[2]; // Get the second command (the sound name)
        handleSoundCommands(client, target, user, commandName, soundName);
    }

    else if (mention === user && commandName === 'followage') {
        let username = argument; // Assign argument to username by default
        if (!username) {
            client.say(target, `You must provide a user.`);
            return;
        }
        if (username.startsWith('@')) {
            username = username.slice(1);
        }

        if (target.startsWith('#')) {
            target = target.slice(1);
        }

        console.log(`username: ${username}`);
        console.log(`target: ${target}`);
        const response = await axios.get(`https://decapi.me/twitch/followage/${target}/${username.toLowerCase()}?token=${process.env.DECAPI_TOKEN}`);

        if (response.status === 200) {
            client.say(target, `${response.data}`);
            console.log(`API response: ${response.data}`);
        } else {
            client.say(target, `Could not fetch followage for ${username}.`);
            console.log(`Could not fetch followage for ${username}.`);
        }
        console.log(`* Executed ${commandName} command`);
    }

    else if (mention === user && commandName === 'addquote') {
        const quote = parts.slice(2).join(' '); // Get the quote from the message
        db.run('INSERT INTO quotes(quote) VALUES(?)', quote, (err) => {
            if (err) {
                console.error(err.message);
            }
            client.say(target, `Quote added: "${quote}"`);
            console.log(`* Executed ${commandName} command`);
        });
    }

    else if (mention === user && commandName === 'quote') {
        db.get('SELECT quote FROM quotes ORDER BY RANDOM() LIMIT 1', [], (err, row) => {
            if (err) {
                console.error(err.message);
            }
            if (row) {
                client.say(target, `Quote: "${row.quote}"`);
            } else {
                client.say(target, 'No quotes have been added yet.');
            }
            console.log(`* Executed ${commandName} command`);
        });
    }

    else if (mention === user && commandName === 'help') {
        client.say(target, `Commands: ${user}  + command: crypto <crypto>, sfx <audio>, sounds, sdxl <prompt>, guess <number>, so <user>, discord, dice.`);
        console.log(`* Executed ${commandName} command`);
    }

    else if (mention === user && commandName === 'u' && parts[2] === 'up?') {
        client.say(target, 'She down, I\'m up! PogChamp PogChamp PogChamp');
        console.log(`* Executed ${commandName} command`);
    }

    else if (mention === user && commandName === 'sdxl') {
        const userInput = parts.slice(2).join(' ');

        client.say(target, "Processing!!")

        generate(userInput).then(output => {
            console.log(typeof output);
            client.say(target, output[0]);
        });
    }

    else {
        if (mention === user) {
            client.say(target, `Unknown command. For a list of commands, type @${client.getUsername()} help`);
            console.log(`* Unknown command. For a list of commands, type @${client.getUsername()} help`);
        }
    }
}

// Function called when the "dice" command is issued
function rollDice() {
    const sides = 6;
    return Math.floor(Math.random() * sides) + 1;
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
    console.log(`* Connected to ${addr}:${port}`);
}

async function generate(userInput) {
    const output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
            input: {
                width: 1024,
                height: 1024,
                prompt: userInput,
                refine: "no_refiner",
                scheduler: "K_EULER",
                lora_scale: 0.6,
                num_outputs: 1,
                guidance_scale: 7.5,
                apply_watermark: true,
                high_noise_frac: 0.8,
                negative_prompt: "",
                prompt_strength: 0.8,
                num_inference_steps: 50
            }
        }
    );
    return output
}