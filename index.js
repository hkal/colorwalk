const Color = require('color');
const css = require('css');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const themableProperties = new Set([
  'color', 'box-shadow', 'text-shadow', 'outline-color', 'background-image', 'background-color',
  'border-left-color', 'border-right-color', 'border-top-color', 'border-bottom-color', '-webkit-border-image',
  'fill', 'stroke'
]);

// Can't be a Set since we can receive values such as 'blue !important' or '0 0 0 0 green !important' and must rely
// on includes()
const colorKeywords = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black', 'blanchedalmond', 'blue',
  'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk',
  'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray', 'darkgreen', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue', 'darkslategray',
  'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue', 'dimgray', 'dodgerblue', 'firebrick', 'floralwhite',
  'forestgreen', 'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'grey', 'green', 'greenyellow',
  'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender', 'lavenderblush', 'lawngreen', 'lemonchiffon',
  'lightblue', 'lightcoral', 'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta',
  'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue', 'mediumspringgreen',
  'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive',
  'olivedrab', 'orange', 'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred', 'papayawhip', 'peachpuff',
  'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple', 'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown',
  'seagreen', 'seashell', 'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'snow', 'springgreen', 'steelblue',
  'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke', 'yellow', 'yellowgreen'
];

const COLOR_PATTERN = /((?:rgb|hsl)a?\([^)]+\)|#[0-9a-fA-F]{8}|#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3,4}|\b[a-zA-Z]+\b(?!-))/g;

function getColorValues(value) {
  let values = [];
  const items = value.replace(COLOR_PATTERN, '\0$1\0').split('\0');

  for (let i = 0; i < items.length; ++i) {
    try {
      values.push(Color(items[i]).rgb().string());
    } catch(_) {}
  }

  return values;
}

function walkDir(dir, callback, files) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);

    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback, files);
    } else {
      callback(path.join(dir, f), files);
    }
  });

  return files;
};

function filterFilePath(filePath, files) {
  if (!filePath.endsWith('.css')) {
    return;
  }

  files.push(filePath);
}

function processFile(filepath, map) {
  const fileText = fs.readFileSync(filepath, 'utf-8').toString();
  const ast = css.parse(fileText);

  for (let i = 0; i < ast.stylesheet.rules.length; i++) {
    const rule = ast.stylesheet.rules[i];

    if (rule.type !== 'rule') {
      continue;
    }

    for (let j = 0; j < rule.declarations.length; j++) {
      const declaration = rule.declarations[j];

      if (!themableProperties.has(declaration.property)) {
        continue;
      }

      const values = getColorValues(declaration.value.toLowerCase());

      for (let k = 0; k < values.length; k++) {
        const value = values[k];
        let occurrences = map.has(value) ?
          map.get(value) : 0;

        occurrences++;

        map.set(value, occurrences);
      }
    }
  }
}

function createReport(cssFiles) {
  const report = {};
  const valueMap = new Map();

  for (let i = 0; i < cssFiles.length; i++) {
    const filepath = cssFiles[i];

    processFile(filepath, valueMap);
  }

  report.fileCount = cssFiles.length;
  report.uniqueColorCount = valueMap.size;
  report.valueMap = valueMap;

  return report;
}

function printReport(report) {
  console.log(`
CSS Color Value Inventory

# of CSS files: ${report.fileCount}
# of unique color values: ${report.uniqueColorCount}
  `);

  let tableData = [];
  report.valueMap.forEach((value, key) => {
    tableData.push({
      'Color Values': key,
      'Occurrences': value
    });
  });

  const sortedTableData = tableData.sort((a, b) => b.Occurrences - a.Occurrences);
  console.table(sortedTableData);
}

function main() {
  const r = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  r.question('What is the absolute path to DevTools frontend? ', (ans) => {
    const projectPath = ans;
    const cssFiles = walkDir(projectPath, filterFilePath, []);
    const report = createReport(cssFiles);

    printReport(report);
  });
}

main();