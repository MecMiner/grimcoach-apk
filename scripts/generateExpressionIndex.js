const fs = require('fs');
const path = require('path');

const EXPRESSIONS_DIR = path.join(__dirname, '..', 'assets', 'expressoes');
const OUTPUT_FILE = path.join(__dirname, '..', 'src', 'constants', 'expressionAssets.ts');
const VALID_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function scan() {
  if (!fs.existsSync(EXPRESSIONS_DIR)) {
    console.error('❌ Diretório assets/expressoes não encontrado!');
    return;
  }

  const catalog = {};
  const emotions = fs.readdirSync(EXPRESSIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  emotions.forEach((emotion) => {
    catalog[emotion] = {};
    const emotionPath = path.join(EXPRESSIONS_DIR, emotion);

    const levels = fs.readdirSync(emotionPath, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    levels.forEach((level) => {
      const levelPath = path.join(emotionPath, level);
      const files = fs.readdirSync(levelPath)
        .filter((file) => VALID_EXTENSIONS.includes(path.extname(file).toLowerCase()));

      catalog[emotion][level] = files;
    });
  });

  let ts = `// ⚠️ GERADO AUTOMATICAMENTE. NÃO EDITE NA MÃO.\n`;
  ts += `export type EmotionType = '${emotions.join("' | '")}';\n`;
  ts += `export type LevelType = 'nivel1' | 'nivel2' | 'nivel3' | 'nivel4';\n\n`;
  ts += `export const EXPRESSION_ASSETS: Record<string, Record<string, any[]>> = {\n`;

  for (const emotion of Object.keys(catalog)) {
    ts += `  '${emotion}': {\n`;
    for (const level of Object.keys(catalog[emotion])) {
      const files = catalog[emotion][level];
      ts += `    '${level}': [\n`;
      files.forEach((file) => {
        ts += `      require('../../assets/expressoes/${emotion}/${level}/${file}'),\n`;
      });
      ts += `    ],\n`;
    }
    ts += `  },\n`;
  }
  ts += `};\n`;

  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(OUTPUT_FILE, ts, 'utf-8');
  console.log('✅ Índice de imagens gerado com sucesso em:', OUTPUT_FILE);
}

scan();