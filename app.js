const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const bodyParser = require('body-parser');

const app = express();

// 添加json解析
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

// 允许所有的请求形式
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use(express.static('public'));


const createFolder = function (folder) {
  try {
    fs.accessSync(folder);
  } catch (e) {
    fs.mkdirSync(folder);
  }
};

const uploadFolder = './upload/tmp/';

createFolder(uploadFolder);

// 通过 filename 属性定制
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // console.log(file);
    createFolder(uploadFolder + file.fieldname);
    cb(null, uploadFolder + file.fieldname); // 保存的路径，需要自己创建
  },
  filename: function (req, file, cb) {
    // 将保存文件名设置为 字段名 + 时间戳，比如 logo-1478521468943
    // console.log(req.body);
    // console.log(1);
    cb(null, req.body.pointer + '-' + file.fieldname);
  }
});

// 通过 storage 选项来对 上传行为 进行定制化
var upload = multer({
  storage: storage
})


// 单图上传
app.post('/upload', upload.any(), function (req, res, next) {
  let dirName = req.files[0].fieldname;
  // console.log(dirName);
  let state = req.body.state;
  // console.log(state);
  if (state === 'end') {
    // 将所有文件片段组合
    const remotePath = './upload/tmp/' + dirName;
    const targetPath = './upload/' + dirName;
    let pointer = req.body.pointer;

    // 如果之前已经有了该文件，将其删除
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    console.log(pointer);
    for (let i = 0; i <= pointer; i++) {
      let fileName = i + '-' + dirName;
      let content = fs.readFileSync(path.join(remotePath, fileName));
      // console.log(path.join(remotePath, fileName));
      // 追加文件
      fs.appendFileSync(targetPath, content);

    }
  }

  res.json({
    code: 200,
    msg: 'success'
  });
});

app.get('/', function (req, res, next) {
  res.sendFile(__dirname + "/public/" + "form.html");
});

app.listen(3000);