let flag = true;

// 监听选择文件
let myFiles = document.querySelector('#myFiles');
myFiles.addEventListener('change', function () {
  let files = this.files;
  console.log(files);
  let tbody = document.querySelector('#tbody');
  tbody.innerHTML = "";
  for (let i = 0; i < files.length; i++) {
    let fileName = files[i].name;
    let fileType = files[i].type;
    let fileSize = files[i].size;
    let progress = '未上传';
    let uploadVal = '开始上传';
    let bColor = '#2d8cf0';
    let logContent = localStorage.getItem(fileName);
    let percent;
    // 分块进度
    if (logContent) {
      logContent = JSON.parse(logContent);
      percent = (logContent.pointer / logContent.blocks.length * 100).toFixed(1);
      console.log(percent);
    }
    if (percent && percent < 100) {
      progress = '进度 ' + percent + '%';
      uploadVal = '继续上传';
    } else if (percent && percent >= 100) {
      progress = '已上传';
      uploadVal = '重新上传';
      bColor = '#00cc66';
    }
    // 计算文件大小
    let size = files[i].size > 1024 ?
      files[i].size / 1024 > 1024 ?
      files[i].size / (1024 * 1024) > 1024 ?
      (files[i].size / (1024 * 1024 * 1024)).toFixed(2) + 'GB' :
      (files[i].size / (1024 * 1024)).toFixed(2) + 'MB' :
      (files[i].size / 1024).toFixed(2) + 'KB' :
      (files[i].size).toFixed(2) + 'B';
    // 插入模板
    let moduleStr = `        
    <tr>
      <td>${fileName}</td>
      <td>${fileType}</td>
      <td>${size}</td>
      <td class="upload-progress">${progress}</td>
      <td>
        <input type="button" class="upload-item-btn" data-name="${fileName}" data-size="${fileSize}"
          data-state="default" style="background-color: ${bColor}" value="${uploadVal}">
      </td>
    </tr>`;
    // 插入节点
    let tr = document.createElement('tr');
    tr.innerHTML = moduleStr;
    tbody.appendChild(tr);
    // console.log(moduleStr);
  }
  // 监听文件上传点击
  addListenerFileUpload();
});


/**
 * 上传文件时，提取相应匹配的文件项
 * 
 * @param  {String} fileName   需要匹配的文件名
 * @return {FileList}          匹配的文件项目
 * 
 */

function findTheFile(fileName) {
  console.log(document.querySelector('#myFiles'));
  let files = document.querySelector('#myFiles').files;
  let theFile;

  for (let i = 0; i < files.length; ++i) {
    if (files[i].name === fileName) {
      theFile = files[i];
      break;
    }
  }

  return theFile ? theFile : [];
}

// 上传文件
function addListenerFileUpload() {

  // 监听单个上传文件(冒泡监听)
  let tbody = document.querySelector('#tbody');
  // console.log(uploadItem);
  tbody.addEventListener('click', function (e) {
    let target = e.target;
    if (target.getAttribute('class') === 'upload-item-btn') {
      // 点击了对应按钮
      let file = findTheFile(target.getAttribute('data-name'));
      fileUpload(file, target);
    }
  })
}

/**
 * 切割大小
 * 
 * @param   {Number}  contentLength   文件总大小
 * @param   {Number}  blockSize       分块大小
 * @return  {Array}        文件分块情况
 * 
 */
function cutSize(contentLength, blockSize) {
  //向后取整
  let blockLen = Math.ceil(contentLength / blockSize);
  let blist = [];
  for (let i = 0, strat, end; i < blockLen; i++) {
    strat = i * blockSize;
    end = (i + 1) * blockSize;
    end = end > contentLength ? contentLength : end;
    blist.push({
      strat: strat,
      end: end
    });
  }
  return blist;
}

async function fileUpload(file, target) {
  // 分块大小 10MB
  let blockSize = 1024 * 1024 * 10;
  // let blockSize = 1024 * 30;
  let fileName = file.name;


  let logContent = localStorage.getItem(fileName);
  if (logContent) {
    logContent = JSON.parse(logContent);
    // 比较文件是否发生更改
    if (file.lastModified !== logContent.lastModified) {
      logContent = null;
    }
  }

  // 如果本地没有存文件信息（或者文件已经修改）
  if (!logContent) {
    // 判断是否分块（小于的都不需要分块）
    if (file.size > blockSize) {
      // 计算分块
      let blist = cutSize(file.size, blockSize);
      // console.log(blist);
      // 存入localStorage中的数据
      logContent = {
        lastModified: file.lastModified,
        fileName: file.name,
        contentLength: file.size,
        blocks: blist,
        pointer: 0
      };
      localStorage.setItem(file.name, JSON.stringify(logContent));
    } else {
      // 不分块，直接上传


    }
  }
  // 本地已经有文件信息
  if (logContent) {
    if (target.getAttribute('data-state') === 'pending') {
      target.setAttribute('data-state', 'stop');
    } else if (target.getAttribute('data-state') === 'stop') {
      target.setAttribute('data-state', 'pending');
      flag = true;
    }

    console.log(target.getAttribute('data-state'));
    if (target.getAttribute('data-state') === 'default') {
      target.setAttribute('data-state', 'pending');
    }

    // 如果已经上传完毕了，那就重新上传
    if (logContent.pointer >= logContent.blocks.length) {
      logContent.pointer = 0;
      localStorage.setItem(file.name, JSON.stringify(logContent));
      // 操作DOM
      target.parentNode.parentNode.children[3].innerHTML = '进度 ' + 0 + '%';
      target.style.backgroundColor = '#ff6600';
      target.value = '暂停';
      target.setAttribute('data-state', 'pending');
    }

    // 遍历存入的信息并上传
    for (let i = logContent.pointer; i < logContent.blocks.length && flag; i++) {
      let block = logContent.blocks[i];
      let formData = new FormData();
      // let name = logContent.pointer + '-' + fileName;
      formData.append('pointer', logContent.pointer);
      formData.append(fileName, file.slice(block.strat, block.end));

      if (i === 0) {
        // 表示第一个片段，后端如果还有没全部完成的文件，将其删除重传
        formData.append('state', 'start')
      } else if (i === logContent.blocks.length - 1) {
        // 最后一个文件片段，传给后端一个state: 'end'表示最后一个
        formData.append('state', 'end');
      } else {
        // 传输中
        formData.append('state', 'pending');
      }

      console.log(logContent.pointer);
      let res = await uploadBlock(formData);
      await sleep(1000);
      // console.log(res);
      if (res && res.code === 200) {
        logContent.pointer++;
        localStorage.setItem(file.name, JSON.stringify(logContent));
        let percent = (logContent.pointer / logContent.blocks.length * 100).toFixed(1);
        target.parentNode.parentNode.children[3].innerHTML = '进度 ' + percent + '%';

        if (target.getAttribute('data-state') === 'stop') {
          flag = false;
          target.style.backgroundColor = '#2d8cf0';
          target.value = '开始';
        } else if (target.getAttribute('data-state') === 'pending') {
          flag = true;
          target.style.backgroundColor = '#ff6600';
          target.value = '暂停';
        }
      }
      if (logContent.pointer === logContent.blocks.length) {
        target.value = '重新上传';
        target.style.backgroundColor = '#00cc66';
        target.setAttribute('data-state', 'default');
      }
    }
    // 已经上传完毕

  }


}

function sleep(time) {
  return new Promise((resolve) => {
    return setTimeout(resolve, time);
  })
}


function uploadBlock(formData) {
  // 上传
  return fetch('/upload', {
    method: 'post',
    body: formData
  })
  .then(res => res.json())
}