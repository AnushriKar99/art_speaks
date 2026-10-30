const fs = require("fs");
const path = require("path");

const png32 = fs.readFileSync(path.join(__dirname, "../public/icon-32.png"));
const png48 = fs.readFileSync(path.join(__dirname, "../public/icon-48.png"));

const images = [
  { width: 32, height: 32, data: png32 },
  { width: 48, height: 48, data: png48 },
];

const headerSize = 6;
const dirEntrySize = 16;
let currentOffset = headerSize + images.length * dirEntrySize;

const header = Buffer.alloc(headerSize);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Type 1 (Icon)
header.writeUInt16LE(images.length, 4); // Count

const dirEntries = [];
const imageBuffers = [];

for (const img of images) {
  const entry = Buffer.alloc(dirEntrySize);
  entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
  entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
  entry.writeUInt8(0, 2); // Color count
  entry.writeUInt8(0, 3); // Reserved
  entry.writeUInt16LE(1, 4); // Planes
  entry.writeUInt16LE(32, 6); // BPP
  entry.writeUInt32LE(img.data.length, 8); // Size
  entry.writeUInt32LE(currentOffset, 12); // Offset
  dirEntries.push(entry);
  imageBuffers.push(img.data);
  currentOffset += img.data.length;
}

const icoBuffer = Buffer.concat([header, ...dirEntries, ...imageBuffers]);

fs.writeFileSync(path.join(__dirname, "../app/favicon.ico"), icoBuffer);
fs.writeFileSync(path.join(__dirname, "../public/favicon.ico"), icoBuffer);

// Clean up temporary sizing pngs
fs.unlinkSync(path.join(__dirname, "../public/icon-32.png"));
fs.unlinkSync(path.join(__dirname, "../public/icon-48.png"));

console.log("Successfully created crisp PNG-compressed favicon.ico (" + icoBuffer.length + " bytes)");
