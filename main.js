const fse = require("fs-extra")
const { differenceInCalendarDays, format } = require("date-fns")

/**
 * Looks for files and dirs signed with tempTag and moves them to temporary folder which will be cleard on next run
 * @param {String} path path to dir to clear
 * @param {Boolean} silentlyRmv should clear temporary folder?
 * @param {String} tempTag tag used to sign files to remove
 * @param {String} timestampType which timestamp use to check file age:
 *   birthtime,
 *   mtime - modification time,
 *   ctime - change time (as above + perm and ownership change),
 *   atime - access time
 */
const main = async (
  path = "C:/Users/kris/OneDrive/Pobrane/tmp",
  silentlyRmv = false,
  tempTag = "",
  timestampType = "mtime"
) => {
  try {
    // remove files from tmp directory or just ensure it exists:
    if (silentlyRmv) {
      await fse.emptyDir(`${path}/_toRemove`)
    } else {
      await fse.ensureDir(`${path}/_toRemove`)
    }

    // read files and leave only that includes tag:
    let files = await fse.readdir(path)
    files = files.filter((fileName) => fileName.includes(tempTag))

    // check creation date and move to temp dir:
    let movedCounter = 0
    await Promise.all(
      files.map(async (fileName) => {
        const fileStats = await fse.stat(`${path}/${fileName}`)
        if (
          // check file age and prevent moving dirs:
          differenceInCalendarDays(
            new Date(),
            new Date(fileStats[timestampType])
          ) > 14 &&
          fileStats.isFile()
        ) {
          // separate try...catch to handle duplicated files:
          try {
            await fse.move(
              `${path}/${fileName}`,
              `${path}/_toRemove/${fileName}`
            )
            movedCounter++
          } catch (err) {
            if (err.message === "dest already exists.") {
              await fse.move(
                `${path}/${fileName}`,
                `${path}/_toRemove/DUP-${format(new Date(), "T")}-${fileName}`
              )
              movedCounter++
            } else throw err
          }
        }
      })
    )
    console.log(`Files moved: ${movedCounter}`)
    process.exitCode = 0
  } catch (err) {
    console.log(err)
  }
}

main()
