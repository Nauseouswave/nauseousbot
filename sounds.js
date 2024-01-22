const fs = require('fs');
const path = require('path');
const wavPlayer = require('node-wav-player');

module.exports = function handleSoundCommands(client, target, user, commandName, soundName) {
    if (commandName === 'sounds') {
        fs.readdir('./sounds', (err, files) => {
            if (err) {
                console.error(err);
                return;
            }
            const soundFiles = files.filter(file => path.extname(file) === '.wav');
            const soundNames = soundFiles.map(file => path.basename(file, '.wav'));
            client.say(target, `Available sounds: ${soundNames.join(', ')}`);
        });
    } else {
        const soundFilePath = `./sounds/${soundName}.wav`;
        fs.access(soundFilePath, fs.constants.F_OK, (err) => {
            if (err) {
                console.log(`Sound file ${soundFilePath} does not exist.`);
            } else {
                wavPlayer.play({
                    path: soundFilePath,
                }).catch(console.error);
            }
        });
    }
};