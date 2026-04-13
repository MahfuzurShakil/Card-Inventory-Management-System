import {
  getFinishedGoodsDisplayName,
  getFinishedGoodsLabelCode,
  getFinishedGoodsMetaLine,
  getFinishedGoodsQuantityLabel,
} from '../utils/finishedGoodsLabels';

const CODE128_PATTERNS = [
  '11011001100', '11001101100', '11001100110', '10010011000', '10010001100',
  '10001001100', '10011001000', '10011000100', '10001100100', '11001001000',
  '11001000100', '11000100100', '10110011100', '10011011100', '10011001110',
  '10111001100', '10011101100', '10011100110', '11001110010', '11001011100',
  '11001001110', '11011100100', '11001110100', '11101101110', '11101001100',
  '11100101100', '11100100110', '11101100100', '11100110100', '11100110010',
  '11011011000', '11011000110', '11000110110', '10100011000', '10001011000',
  '10001000110', '10110001000', '10001101000', '10001100010', '11010001000',
  '11000101000', '11000100010', '10110111000', '10110001110', '10001101110',
  '10111011000', '10111000110', '10001110110', '11101110110', '11010001110',
  '11000101110', '11011101000', '11011100010', '11011101110', '11101011000',
  '11101000110', '11100010110', '11101101000', '11101100010', '11100011010',
  '11101111010', '11001000010', '11110001010', '10100110000', '10100001100',
  '10010110000', '10010000110', '10000101100', '10000100110', '10110010000',
  '10110000100', '10011010000', '10011000010', '10000110100', '10000110010',
  '11000010010', '11001010000', '11110111010', '11000010100', '10001111010',
  '10100111100', '10010111100', '10010011110', '10111100100', '10011110100',
  '10011110010', '11110100100', '11110010100', '11110010010', '11011011110',
  '11011110110', '11110110110', '10101111000', '10100011110', '10001011110',
  '10111101000', '10111100010', '11110101000', '11110100010', '10111011110',
  '10111101110', '11101011110', '11110101110', '11010000100', '11010010000',
  '11010011100', '1100011101011',
];

function encode128(text) {
  let checksum = 104;
  const parts = [CODE128_PATTERNS[104]];

  for (let index = 0; index < text.length; index += 1) {
    const value = text.charCodeAt(index) - 32;
    if (value < 0 || value > 94) continue;
    checksum += value * (index + 1);
    parts.push(CODE128_PATTERNS[value]);
  }

  parts.push(CODE128_PATTERNS[checksum % 103], CODE128_PATTERNS[106], '11');
  return parts.join('');
}

function FinishedGoodsBarcodeSVG({ value, width = 340, height = 52, fontSize = 10 }) {
  const bits = encode128(value);
  const moduleWidth = width / bits.length;
  const barHeight = height - fontSize - 2;
  const merged = [];
  let current = null;

  for (let index = 0; index <= bits.length; index += 1) {
    const on = index < bits.length && bits[index] === '1';
    if (on && !current) current = { x: index * moduleWidth, w: moduleWidth };
    else if (on && current) current.w += moduleWidth;
    else if (!on && current) {
      merged.push(current);
      current = null;
    }
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} xmlns="http://www.w3.org/2000/svg">
      <rect width={width} height={height} fill="white" />
      {merged.map((bar, index) => (
        <rect key={index} x={bar.x} y={0} width={bar.w} height={barHeight} fill="#000" />
      ))}
      <text x={width / 2} y={height - 1} textAnchor="middle" fontSize={fontSize} fontFamily="monospace" fill="#000">
        {value}
      </text>
    </svg>
  );
}

function FinishedGoodsLabelPreview({ subBox }) {
  return (
    <div
      className="bg-white border border-gray-300 rounded-md shadow-sm mx-auto"
      style={{
        width: '100%',
        maxWidth: 420,
        aspectRatio: '100 / 60',
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxSizing: 'border-box',
      }}
    >
      <div className="flex justify-between items-center">
        <span className="text-gray-400 font-bold uppercase tracking-widest" style={{ fontSize: 8 }}>
          Finished Goods Label
        </span>
        <span className="text-gray-300" style={{ fontSize: 8 }}>
          {getFinishedGoodsLabelCode(subBox)}
        </span>
      </div>

      <p className="text-center font-extrabold text-gray-900 tracking-wide" style={{ fontSize: 15 }}>
        {getFinishedGoodsDisplayName(subBox)}
      </p>

      <div className="flex justify-center">
        <FinishedGoodsBarcodeSVG value={subBox.barcode} width={340} height={52} fontSize={10} />
      </div>

      <div className="flex justify-between text-gray-600 border-t border-gray-100 pt-1 gap-3" style={{ fontSize: 9 }}>
        <span className="truncate">{getFinishedGoodsMetaLine(subBox)}</span>
        <span className="shrink-0">{getFinishedGoodsQuantityLabel(subBox)}</span>
      </div>
    </div>
  );
}

export default FinishedGoodsLabelPreview;
