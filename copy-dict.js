const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'node_modules', 'kuromoji', 'dict');
const destDir = path.join(__dirname, 'dict');

function copyFolderSync(from, to) {
    if (!fs.existsSync(to)) {
        fs.mkdirSync(to, { recursive: true });
    }
    fs.readdirSync(from).forEach(element => {
        const fromPath = path.join(from, element);
        const toPath = path.join(to, element);
        if (fs.lstatSync(fromPath).isFile()) {
            fs.copyFileSync(fromPath, toPath);
        }
    });
}

try {
    if (fs.existsSync(srcDir)) {
        console.log(`Copying dictionary files from ${srcDir} to ${destDir}...`);
        copyFolderSync(srcDir, destDir);
        console.log('Dictionary files copied successfully.');
    } else {
        console.error(`Source dictionary directory not found at: ${srcDir}`);
    }
} catch (err) {
    console.error('Error copying dictionary files:', err);
    process.exit(1);
}
