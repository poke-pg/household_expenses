"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var fs_1 = __importDefault(require("fs"));
var csv_parse_1 = require("csv-parse");
var iconv_lite_1 = __importDefault(require("iconv-lite"));
var cors_1 = __importDefault(require("cors"));
var multer_1 = __importDefault(require("multer"));
var upload = (0, multer_1.default)({ dest: 'uploads/' });
var app = (0, express_1.default)();
app.use((0, cors_1.default)());
var filePath = '';
// const upload = multer({ dest: 'uploads/'});
app.post('/upload', upload.single('file'), function (req, res) {
    if (!req.file) {
        res.status(400).send('ファイルがありません');
        return;
    }
    console.log('アップロードされたファイル:', req.file);
    filePath = req.file.path;
    res.send('ファイルを受け取りました:' + req.file.originalname);
});
app.get('/customer', function (req, res) {
    var rows = [];
    // const results: any[] = [];
    // CSVファイルを読み込む
    if (!filePath) {
        res.status(400).send('ファイルパスが指定されていません');
        return;
    }
    fs_1.default.createReadStream(filePath)
        .pipe(iconv_lite_1.default.decodeStream('shift_jis')) // Shift_JISからUTF-8に変換
        .pipe((0, csv_parse_1.parse)({ columns: true, skip_empty_lines: true }))
        .on('data', function (row) {
        // 各行のデータをコンソールに出力
        var convertedRow = convertKeys(row);
        console.log('Raws Row:', row);
        rows.push(convertedRow);
    })
        .on('end', function () {
        console.log('CSVファイルの読み込みが完了しました');
        // const result = convertToKeyValue(rows);
        console.log('変換結果:', rows);
        res.send(rows);
    })
        .on('error', function (error) {
        console.error('エラーが発生しました:', error);
    });
});
app.listen(3000, function () {
    console.log('ポート3000でサーバーが起動しました');
});
// CSVデータをキーと値のオブジェクトに変換する関数
// function convertToKeyValue(data: string[][]) {
//   const obj:Record<string, string> = {};
//   data.forEach(([key, value]) => {
//     obj[key] = value;
//   });
//   return obj;
// }
// 日本語キー → 英語キー変換マップ
var keyMap = {
    '日付': 'day',
    '内容': 'description',
    '出金金額(円)': 'withdraw',
    '入金金額(円)': 'deposit',
    '残高(円)': 'balance',
    'メモ': 'note'
};
// キーを変換する関数
var convertKeys = function (row) {
    var converted = {};
    for (var key in row) {
        var newKey = keyMap[key] || key;
        converted[newKey] = row[key];
    }
    return converted;
};
