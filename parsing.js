const fs = require('fs');

function parseBlock(lines, level = 0) {
    const result = {};
    let key = null;

    while (lines.length) {
        let line = lines.shift().trimEnd();
        if (line.trim() === '') continue;

        const currentLevel = (line.search(/\S/) / 2) - 2;

        if (currentLevel < level) {
            lines.unshift(line);
            return result;
        } else if (currentLevel === level) {
            if (line.includes(':')) {
                let [k, v] = line.split(':').map(x => x.trim());
                if (v) {
                    result[k] = v;
                } else {
                    const nestedBlock = parseBlock(lines, level + 1);
                    if (result[k]) {
                        if (Array.isArray(result[k])) {
                            result[k].push(nestedBlock);
                        } else {
                            result[k] = [result[k], nestedBlock];
                        }
                    } else {
                        result[k] = nestedBlock;
                    }
                }
            } else {
                const nestedBlock = parseBlock(lines, level + 1);
                key = line.trim();
                if (result[key]) {
                    if (Array.isArray(result[key])) {
                        result[key].push(nestedBlock);
                    } else {
                        result[key] = [result[key], nestedBlock];
                    }
                } else {
                    result[key] = nestedBlock;
                }
            }
        } else {
            lines.unshift(line);
            return result;
        }
    }
    return result;
}

function parseData(filePath, dataSegment) {
    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

    const data = [];

    while (lines.length) {
        let line = lines.shift().trim();
        if (line === dataSegment) {
            const item = parseBlock(lines);
            data.push(item);
        }
    }

    return data;
}

module.exports = {parseData, parseBlock}