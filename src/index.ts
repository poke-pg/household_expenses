import express from "express";
import fs from "fs";
import { parse } from "csv-parse";
import iconv from "iconv-lite";
import cors from "cors";
import multer from "multer";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";

interface MulterRequest extends express.Request {
  file?: Express.Multer.File;
}

dotenv.config();
const prisma = new PrismaClient();

const upload = multer({ dest: "uploads/" });

const app: express.Express = express();
app.use(cors());
// JSONリクエストをパースするためのミドルウェア
app.use(express.json());

let filePath = "";
// const upload = multer({ dest: 'uploads/'});
app.post(
  "/upload",
  upload.single("file"),
  (req: MulterRequest, res: express.Response): void => {
    if (!req.file) {
      res.status(400).send("ファイルがありません");
      return;
    }
    console.log("アップロードされたファイル:", req.file);
    filePath = req.file.path;

    res.send("ファイルを受け取りました:" + req.file.originalname);
  }
);
app.get("/transaction", async (req, res) => {
  const transaction = await prisma.transaction.findMany();
  res.json(transaction);
  console.log("トランザクションデータ:", transaction);
});
app.post("/transaction", async (req, res) => {
  console.log("リクエストボディ:", req.body);
  const {
    date,
    description,
    withdrawal,
    deposit,
    balance,
    note,
    transactionType,
  } = req.body;
  const transaction = await prisma.transaction.create({
    // Prismaを使用してデータベースにトランザクションを作成
    data: {
      date: new Date(date),
      description,
      withdrawal: withdrawal || 0, // 出金がない場合は0を設定
      deposit: deposit || 0, // 入金がない場合は0を設定
      balance: balance, // 残高がない場合は0を設定
      note: note || "",
      transactionType: transactionType || "defaultType",
    },
  });
  res.json(transaction);
  console.log("トランザクションの作成:", transaction);
});
app.get("/customer", (req: express.Request, res: express.Response) => {
  const rows: object[] = [];
  // const results: any[] = [];
  // CSVファイルを読み込む
  if (!filePath) {
    res.status(400).send("ファイルパスが指定されていません");
    return;
  }
  fs.createReadStream(filePath)
    .pipe(iconv.decodeStream("shift_jis")) // Shift_JISからUTF-8に変換
    .pipe(parse({ columns: true, skip_empty_lines: true }))
    .on("data", (row: object) => {
      // 各行のデータをコンソールに出力
      const convertedRow = convertKeys(row as Record<string, string>);
      console.log("Raws Row:", row);
      rows.push(convertedRow);
    })
    .on("end", () => {
      console.log("CSVファイルの読み込みが完了しました");
      // const result = convertToKeyValue(rows);
      console.log("変換結果:", rows);
      res.send(rows);
    })
    .on("error", (error) => {
      console.error("エラーが発生しました:", error);
    });
});
app.listen(3000, () => {
  console.log("ポート3000でサーバーが起動しました");
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
const keyMap: Record<string, string> = {
  日付: "date",
  内容: "description",
  "出金金額(円)": "withdrawal",
  "入金金額(円)": "deposit",
  "残高(円)": "balance",
  メモ: "note",
  取引種別: "transactionType",
};

// キーを変換する関数
const convertKeys = (row: Record<string, string>) => {
  const converted: Record<string, string> = {};
  for (const key in row) {
    const newKey = keyMap[key] || key;
    converted[newKey] = row[key];
  }
  return converted;
};
