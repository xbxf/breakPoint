/**
 *
 * @type {{__show: UP.__show, __msg: {}, __init: UP.__init, __input: {}}}
 */
let UP = {
    // 定义提示信息
    __msg: {
        done: '上传完成',
        failed: '上传失败',
        in: '上传中...',
        paused: '暂停中...',
        incomplete: '上传不完整'
    },
    // 定义状态值和变量
    __input: {
        fo: null,       // 上传按钮对象
        isPaused: 0,    // 暂停状态
        flushStatus: 0, // 浏览器刷新中断状态
        param: null,    // 初始化参数
        file_obj: null  // 文件信息对象
    },
    // 初始化方法
    __init: function (param) {
        this.__input.param = param;
    },
    // 选择上传显示上传信息
    __show: function (self) {
        let file,
            uploadItem = [],
            uploadItemTpl = $('#file-upload-tpl').html(),
            size,
            percent,
            progress = '未上传',
            uploadVal = '开始上传';
        for (let i = 0, j = self.files.length; i < j; ++i) {
            file = self.files[i];
            percent = undefined;

            size = this.__formatSize(file.size);
            percent = window.localStorage.getItem(file.name + '_p');
            if (percent && percent !== '100.0') {
                progress = '已上传' + percent + '%';
                uploadVal = '继续上传';
            }

            uploadItem.push(uploadItemTpl
                .replace(/{{fileName}}/g, file.name)
                .replace('{{fileType}}', file.type || file.name.match(/\.\w+$/) + '文件')
                .replace('{{fileSize}}', size)
                .replace('{{progress}}', progress)
                .replace('{{totalSize}}', file.size)
                .replace('{{uploadVal}}', uploadVal)
            );
        }
        let _tbody = $('#upload-list').children('tbody');
        $(_tbody).html(uploadItem.join('')).end().show();
    },
    // 格式化文件大小后缀
    __formatSize: function (size) {
        let format;
        format = size > 1024 ? size / 1024 > 1024 ? size / (1024 * 1024) > 1024 ? (size / (1024 * 1024 * 1024)).toFixed(2) + 'GB' : (size / (1024 * 1024)).toFixed(2) + 'MB' : (size / 1024).toFixed(2) + 'KB' : (size).toFixed(2) + 'B';
        return format;
    },
    // 获取文件信息
    __fileInfo: function (self) {
        let $this = $(self);
        let eachSize = this.__input.param.eachSize ? this.__input.param.eachSize : 1024;
        let info = {
            fileThat: $this,
            state: $this.attr('data-state'),
            filename: $this.attr('data-name'),
            progress: $this.closest('tr').find('.upload-progress'),
            eachSize: eachSize,
            totalSize: $this.attr('data-size'),
            chunks: function () {
                return Math.ceil(this.totalSize / this.eachSize);
            },
            percent: 0,
            chunk: 0
        };
        this.__input.file_obj = info;
        return info;
    },
    // 点击上传按钮
    __toUpload: function (self) {
        let that = this;
        that.__input.fo = self;
        let file_obj = that.__fileInfo(self);

        if (file_obj.state === 'uploading') {
            file_obj.fileThat.val('继续上传').attr('data-state', 'paused');
            file_obj.progress.text(that.__msg['paused'] + window.localStorage.getItem(file_obj.filename + '_p') + '%');
            that.__input.isPaused = 1;
        } else if (file_obj.state === 'paused' || file_obj.state === 'default') {
            let c = window.localStorage.getItem(file_obj.filename + '_chunk');
            if ((file_obj.chunks() - 1) == c) {
                alert('该文件已经上传！');
                return;
            }
            if (c > 1 && that.__input.flushStatus === 0) {
                window.localStorage.setItem(file_obj.filename + '_chunk', ++c);
            }
            that.__input.isPaused = 0;
            that.__input.flushStatus = 1;
            file_obj.fileThat.val('暂停上传').attr('data-state', 'uploading');
            that.__startUpload('first');
        }
    },
    __startUpload: function (times) {
        let that = this;
        let file_obj = that.__input.file_obj;
        console.log('共：' + file_obj.chunks() + '片，总大小：' + file_obj.totalSize);
        file_obj.chunk = window.localStorage.getItem(file_obj.filename + '_chunk') || 0;

        file_obj.chunk = parseInt(file_obj.chunk, 10);
        // console.log(file_obj.chunk);return;

        console.log('当前第：', + (file_obj.chunk + 1) + '片');
        var isLastChunk = (file_obj.chunk == (file_obj.chunks() - 1) ? 1 : 0);

        // var isLastChunk = (file_obj.chunk == (file_obj.chunks() - 1) ? 1 : 0);
        if (times === 'first' && isLastChunk === 1) {
            window.localStorage.setItem(file_obj.filename + '_chunk', 0);
            chunk = 0;
            isLastChunk = 0;
        }

        let blobFrom = file_obj.chunk * file_obj.eachSize,
            blobTo = (file_obj.chunk + 1) * file_obj.eachSize > file_obj.totalSize ? file_obj.totalSize : (file_obj.chunk + 1) * file_obj.eachSize,
            percent = (100 * blobTo / file_obj.totalSize).toFixed(1),
            timeout = 5000,
            fd = new FormData($(that.__input.param.myFile)[0]);
        // console.log($(fd));
        // console.log(that.__findTheFile(file_obj.filename));
        fd.append('theFile', that.__findTheFile(file_obj.filename).slice(blobFrom, blobTo));
        fd.append('filename', file_obj.filename);
        fd.append('totalSize', file_obj.totalSize);
        fd.append('isLastChunk', isLastChunk);
        fd.append('isFirstUpload', times === 'first' ? 1 : 0);

        $.ajax({
            url: that.__input.param.serverUrl,
            data: fd,
            type: 'POST',
            timeout: timeout,
            contentType: false,
            processData: false,
            success: function (res) {
                res = JSON.parse(res);
                if (res.status === 200) {
                    window.localStorage.setItem(file_obj.filename + '_p', percent);
                    console.log('---->'+file_obj.chunks());
                    console.log('====>'+file_obj.chunk);
                    if (file_obj.chunk === (file_obj.chunks() - 1)) {
                        file_obj.progress.text(that.__msg['done']);
                        file_obj.fileThat.val('已经上传').prop('disabled', true).css('cursor', 'not-allowed');
                        if (!$('#upload-list').find('.upload-item-btn:not(:disabled)').length) {
                            $('#upload-all-btn').val('已经上传').prop('disabled', true).css('cursor', 'not-allowed');
                        }
                    } else {
                        window.localStorage.setItem(file_obj.filename + '_chunk', ++file_obj.chunk);
                        if (that.__input.isPaused === 0) {

                            file_obj.progress.text(that.__msg['in'] + percent + '%');
                        }

                        if (!that.__input.isPaused) that.__startUpload();
                    }
                } else if (res.status === 500) {
                    file_obj.progress.text(that.__msg['failed']);
                } else if (res.status === 502) {
                    file_obj.progress.text(that.__msg['incomplete']);
                }
            },
            error: function () {
                file_obj.progress.text(that.__msg['failed']);
            }
        });
    },
    __findTheFile: function (filename) {
        let files = $(this.__input.param.myFile)[0].files,
            theFile;
        for (let i = 0, j = files.length; i < j; ++i) {
            if (files[i].name === filename) {
                theFile = files[i];
                break;
            }
        }
        return theFile ? theFile : [];
    }
};

$(function () {
    // 选择文件-显示文件信息
    $(UP.__input.param.myFile).change(function (e) {
        UP.__show(this);
    });
    // 全部上传操作
    $(document).on('click', '#upload-all-btn', function () {

    });
    // 上传文件
    $(document).on('click', '.upload-item-btn', function () {
        UP.__toUpload(this);
    });
});

// 初始化
UP.__init({
    myFile: "#myFile", // fileinput的dom节点
    serverUrl: '/upload/service/upload.php', // 服务器地址
    eachSize: 1024 * 1024 // 分片大小
});


