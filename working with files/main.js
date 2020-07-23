const createDropableFileInput = (callback = () => {}, tag = 'div') => {
  const inputElem = document.createElement(tag);

  inputElem.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  inputElem.addEventListener('drop', function(event) {
    event.preventDefault();

    // this is the best we can do in Firefox
    // if (event.dataTransfer.items) {
    //   // Use DataTransferItemList interface to access the file(s)
    //   for (var i = 0; i < event.dataTransfer.items.length; i++) {
    //     // If dropped items aren't files, reject them
    //     console.log(event.dataTransfer.items[0].kind);

    //     if (event.dataTransfer.items[i].kind === 'file') {
    //       convertEntryToFiles(event.dataTransfer.items[0].webkitGetAsEntry());
    //       var file = event.dataTransfer.items[i].getAsFile();
    //     } else {
    //       callback();
    //     }
    //   }
    // } else {
    //   // Use DataTransfer interface to access the file(s)
    //   for (var i = 0; i < event.dataTransfer.files.length; i++) {
    //     callback(
    //       '... file[' + i + '].name = ' + event.dataTransfer.files[i].name
    //     );
    //   }
    // }

    const convertEntryToFiles = async (entry, callback = () => {}) => {

      async function* getItems(folder) {
        const reader = folder.createReader();
        console.log(reader)

        let items = null;
        do {
          yield (items = await new Promise((resolve, reject) => {
            reader.readEntries((entries) => {
              resolve(entries);
            });
          }));
        } while (items.length !== 0);
      }

      const files = [];
      const recursiveGetFiles = async (items) => {
        for await (let it of items) {
          if (it.isFile) {
            files.push(it);
            callback(it);
          } else if (entry.isDirectory) {
            for await (const items of getItems(it)) {
              recursiveGetFiles(items);
            }
          }
        }
      };

      await recursiveGetFiles([entry]);
      return files;
    };

    callback(
      convertEntryToFiles(event.dataTransfer.items[0].webkitGetAsEntry())
    );
  });
  return inputElem;
};

const promptFileInput = ({
  isDir = false,

  // For today you can't select multiple folders.
  // So [isMultiple] will be ignored if [isDir] is ^true
  isMultiple = true,
}) => {
  const createFileInput = ({ isDir, isMultiple }) => {
    const inputElement = document.createElement('input');
    inputElement.type = 'file';
    inputElement.multiple = isMultiple;
    inputElement.webkitdirectory = isDir;
    return inputElement;
  };

  return new Promise((resolve, reject) => {
    const input = createFileInput({ isDir, isMultiple });
    input.addEventListener('change', (event) => resolve(event.target.files));
    input.click();
  });
};

const elem = createDropableFileInput(console.log);
elem.style.width = '100%';
elem.style.height = '100%';
elem.style.position = 'absolute';
document.write();
document.appendChild(elem);

// console.log(promptFileInput({}))