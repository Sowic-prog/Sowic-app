const fs = require('fs');
const path = 'src/pages/Vehicles.tsx';
try {
    const content = fs.readFileSync(path, 'utf8');
    // Normalize line endings to LF to avoid issues with split
    const lines = content.replace(/\r\n/g, '\n').split('\n');

    // Check if we have enough lines to avoid errors
    if (lines.length < 1200) {
        console.error(`File has only ${lines.length} lines. Expected at least 1201.`);
        process.exit(1);
    }

    const newLines = [
        ...lines.slice(0, 807),
        '            {/* PLACEHOLDER_FOR_NEW_FORM */}',
        ...lines.slice(1200)
    ];

    fs.writeFileSync(path, newLines.join('\n'), 'utf8');
    console.log('File truncated successfully.');
} catch (err) {
    console.error(err);
    process.exit(1);
}
