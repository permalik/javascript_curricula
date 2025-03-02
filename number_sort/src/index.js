import assert from "node:assert";
import { createReadStream } from "node:fs";
import { readdir, stat, mkdir, rm, open, appendFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import inputFiles from "./schema.js";
import randomNumberString from "./utils.js";
import insertionSort from "../insertionSort/index.js";

const SOURCEDIRECTORY = "number_sort/data";
const DESTDIRECTORY = "number_sort/dest";

async function run() {
  try {
    assert.equal(
      await initDirectory(SOURCEDIRECTORY, inputFiles),
      true,
      "Source must be initialized",
    );
    assert.equal(await initDirectory(DESTDIRECTORY), true);
    assert.equal(await populateSource(), true, "Source must be populated");
    assert.equal(
      await sortNumbers(SOURCEDIRECTORY, DESTDIRECTORY),
      true,
      "Numbers must be sorted",
    );
  } catch (err) {
    console.error(`Error in run:\n${err.message}\n`);
  }
}

async function initDirectory(dirPath, files = null) {
  try {
    await rm(dirPath, { recursive: true, force: true }).catch((err) => {
      if (err.code !== "ENOENT") {
        throw new Error(
          `Failed to remove directory ${dirPath}:\n${err.message}\n`,
        );
      }
    });

    await mkdir(dirPath);

    if (files) {
      for (const file of Object.values(files)) {
        await open(`${dirPath}/${file}`, "w").then((f) => f.close());
      }
    }
    return true;
  } catch (err) {
    console.error(`Error initializing ${dirPath}:\n${err.Message}\n`);
    return false;
  }
}

async function populateSource() {
  try {
    let sourcesPopulated = false;
    for (let [_, v] of Object.entries(inputFiles)) {
      let lineCounter = 0;
      do {
        await appendFile(
          `${SOURCEDIRECTORY}/${v}`,
          `${randomNumberString()}\n`,
        ).catch((err) => {
          throw new Error(
            `Failed to populate line to source directory.\n${err.message}\n`,
          );
        });
        lineCounter++;
      } while (lineCounter < 100);
      sourcesPopulated = true;
    }

    return await new Promise((res, rej) => {
      if (sourcesPopulated) {
        res(true);
      } else {
        rej(false);
      }
    });
  } catch (err) {
    console.error(`Error from populateSource().\n${err.message}\n`);
  }
}

async function sortNumbers(sourceDir, destDir) {
  try {
    let isSorted = false;
    const fileNames = await readdir(sourceDir);
    for (let i = 0; i < fileNames.length; i++) {
      const fileNameStat = await stat(`${sourceDir}/${fileNames[i]}`).catch(
        (err) => {
          throw new Error(
            `Failed to stat source file ${fileNames[i]}.\n${err.message}\n`,
          );
        },
      );
      assert.notEqual(
        fileNameStat.size,
        0,
        `Source file ${fileNames[i]} cannot be empty.`,
      );

      const fileStream = createReadStream(`${sourceDir}/${fileNames[i]}`);
      const readline = createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });

      let unsortedLines = [];
      for await (const line of readline) {
        unsortedLines.push(line.trim());
      }

      let sortedLines = [];
      for (let line of unsortedLines) {
        let charStrs = line.split("");
        let charNums = charStrs.map(Number);

        insertionSort(charNums);

        let sortedLine = "";
        for (let num of charNums) {
          let newNum = num.toString();
          sortedLine = `${sortedLine}${newNum}`;
        }

        sortedLines.push(sortedLine);
      }

      const fileHandle = await open(`${destDir}/${fileNames[i]}`, "w").catch(
        (err) => {
          throw new Error(
            `Failed to open dest file${destDir}/${fileNames[i]}.\n${err.message}\n`,
          );
        },
      );

      await fileHandle.close().catch((err) => {
        throw new Error(`Failed to close dest file${v}.\n${err.message}\n`);
      });

      const date = new Date();
      const today = date.toISOString().slice(0, 10).replace(/-/g, "");
      const time = date.toISOString().slice(11, 19).replace(/:/g, "");
      const milliseconds = date.getMilliseconds().toString().padStart(3, "0");
      const timestamp = today + time + milliseconds;
      for (const sortedLine of sortedLines) {
        await appendFile(
          `${destDir}/${timestamp}.${fileNames[i]}`,
          `${sortedLine}\n`,
        ).catch((err) => {
          throw new Error(
            `Failed to populate dest directory.\n${err.message}\n`,
          );
        });
      }

      if (i === fileNames.length - 1) {
        isSorted = true;
      }
    }

    return new Promise((res, rej) => {
      if (isSorted) {
        res(true);
      } else {
        rej(false);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

await run();
