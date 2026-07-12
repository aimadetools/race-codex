import fs from "fs";
import path from "path";

const htmlFiles = fs.readdirSync(".").filter((file) => file.endsWith(".html")).sort();
const errors = [];

function validateItemList(file, data, blockIndex) {
  if (!data || data["@type"] !== "ItemList" || !Array.isArray(data.itemListElement)) {
    return;
  }

  const positions = [];
  const urls = [];
  for (const [index, item] of data.itemListElement.entries()) {
    if (!item || item["@type"] !== "ListItem") {
      continue;
    }
    if (typeof item.position !== "number" || !Number.isInteger(item.position)) {
      errors.push(
        `${file} script #${blockIndex}: itemListElement[${index}] is missing an integer position`
      );
      continue;
    }
    positions.push(item.position);

    if (typeof item.url !== "string" || !item.url.length) {
      errors.push(`${file} script #${blockIndex}: itemListElement[${index}] is missing a URL`);
      continue;
    }
    urls.push(item.url);
  }

  if (!positions.length) {
    return;
  }

  const seen = new Set();
  for (const position of positions) {
    if (seen.has(position)) {
      errors.push(`${file} script #${blockIndex}: duplicate ItemList position ${position}`);
    }
    seen.add(position);
  }

  for (let index = 0; index < positions.length; index += 1) {
    const expected = index + 1;
    if (positions[index] !== expected) {
      errors.push(
        `${file} script #${blockIndex}: expected ItemList position ${expected} at entry ${
          index + 1
        }, found ${positions[index]}`
      );
    }
  }

  const seenUrls = new Set();
  for (const url of urls) {
    if (seenUrls.has(url)) {
      errors.push(`${file} script #${blockIndex}: duplicate ItemList URL ${url}`);
    }
    seenUrls.add(url);
  }
}

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(".", file), "utf8");
  const matches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);

  let blockIndex = 0;
  for (const match of matches) {
    blockIndex += 1;
    try {
      const data = JSON.parse(match[1]);
      validateItemList(file, data, blockIndex);
    } catch (error) {
      errors.push(`${file} script #${blockIndex}: invalid JSON-LD (${error.message})`);
    }
  }
}

if (errors.length) {
  console.error("Structured-data ItemList check failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(`Structured-data ItemList check passed for ${htmlFiles.length} HTML files.`);
