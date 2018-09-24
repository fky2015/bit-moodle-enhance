// ==UserScript==
// @name         北理工乐学增强
// @namespace    YinTianliang_i
// @version      1.5.10
// @description  增强北理工乐学的功能
// @author       Yin Tianliang
// @include      *//online.bit.edu.cn/*
// @grant        GM_setClipboard
// @run-at       document-end
// @require      http://code.jquery.com/jquery-latest.js

// ==/UserScript==

/*jshint esversion: 6 */

// 来自 http://www.cnblogs.com/colima/p/5339227.html

let prefixURL = 'http://online.bit.edu.cn/moodle/mod/programming';
let Ajax = {
    //get: $.get,
    get: function (url, fn) {
        let obj = new XMLHttpRequest(); // XMLHttpRequest对象用于在后台与服务器交换数据
        obj.open('GET', url, true);
        obj.onreadystatechange = function () {
            if (obj.readyState == 4 && obj.status == 200 || obj.status == 304) { // readyState == 4说明请求已完成
                fn.call(this, obj.responseText); //从服务器获得数据
            }
        };
        obj.send();
    },
    post: function (url, data, fn) { // datat应为'a=a1&b=b1'这种字符串格式，在jq里如果data为对象会自动将对象转成这种字符串格式
        let obj = new XMLHttpRequest();
        obj.open("POST", url, true);
        obj.setRequestHeader("Content-type", "application/x-www-form-urlencoded"); // 添加http头，发送信息至服务器时内容编码类型
        obj.onreadystatechange = function () {
            if (obj.readyState == 4 && (obj.status == 200 || obj.status == 304)) { // 304未修改
                fn.call(this, obj.responseText);
            }
        };
        obj.send(data);
    }
}

let divTemp = (color, text) => {
    return `<div style="color:${color}"><b>${text}</b></div>`;
};

function AddClickBack() {
    let navigation = document.getElementsByClassName('breadcrumb')[0].children;
    let parent_id = navigation[1].firstChild.href.match(/id=(\d+)/)[1];
    let label_list = JSON.parse(localStorage["label_" + parent_id]);

    if (localStorage["label_" + parent_id]) {
        let parent_name = navigation[2].firstChild.textContent;
        let parent_url = `${navigation[1].firstChild.href}#${label_list[parent_name]}`;
        navigation[2].firstChild.innerHTML =
            `<a title="${parent_name}" href="${parent_url}">${parent_name}</a>`;
    }
}

function RefreshLabels(id) {
    let label_list = !localStorage["label_" + id] ? {} : JSON.parse(localStorage["label_" + id]);
    let weekworks = document.getElementsByClassName('section main clearfix');

    for (let week_work of weekworks) {
        let label = week_work.getAttribute('aria-label');
        if (label !== null) {
            label_list[label] = week_work.id;
        }
    }
    localStorage["label_" + id] = JSON.stringify(label_list);
}

function AddMyACCount(id) {
    let table = document.getElementsByClassName('generaltable')[1].children[1];

    if (table.rows[0].cells[0].textContent != '0') { // 判断是否已经增加了一行
        let row = table.insertRow(0);
        row.insertCell(0).textContent = '0';
        row.insertCell(1).textContent = 'Your';
        row.insertCell(2).textContent = JSON.parse(localStorage["AC_" + id]).length;
    } else {
        table.rows[0].cells[2].textContent = JSON.parse(localStorage["AC_" + id]).length;
    }
}

// TODO:对加载页面的影响有点大 一直显示等待响应(其实就是欠的题太多了)
function RefreshACStatus(id) {
    let reg = new RegExp("userloginex|contest_login.php.cid=(\\d+)");
    let matches = location.toString().match(reg);
    let problem_list = document.getElementsByClassName("activity programming modtype_programming");

    for (let problem of problem_list) {
        let problem_id = problem.id.split("-")[1];
        let dstDiv = problem.firstChild.firstChild.firstChild;

        // 有些题目没有没对齐不能忍
        if (dstDiv.className == "mod-indent") {
            dstDiv.className += " mod-indent-1";
        }

        // 待优化 no let!!!
        id_list = !localStorage["AC_" + id] ? [] : JSON.parse(localStorage["AC_" + id]);
        ddl_list = !localStorage["DDL_" + id] ? [] : JSON.parse(localStorage["DDL_" + id]);

        if (id_list.indexOf(problem_id) != -1) {
            dstDiv.innerHTML = divTemp('green', 'AC');
        } else if (ddl_list.indexOf(problem_id) != -1) {
            dstDiv.innerHTML = divTemp('gray', 'DDL');
        } else {
            Ajax.get(`${prefixURL}/result.php?id=${problem_id}`,
                res => {
                    matches = res.match(/未能通过的有 *(\d+)* *个/);
                    if (matches) {
                        if (matches[1] == "0") {
                            id_list = id_list.concat(problem_id);
                            localStorage["AC_" + id] = JSON.stringify(id_list);
                            // 这个post是异步的, 所以只能每一次post完成都刷新一次AC数
                            // 确保AC数正确
                            AddMyACCount(id);
                            dstDiv.innerHTML = divTemp('green', 'AC');
                        } else {
                            dstDiv.innerHTML = divTemp('red', 'WA');
                        }
                    } else if (/当前状态：程序编译失败。/.test(res)) {
                        dstDiv.innerHTML = divTemp('orange', 'CE');
                    } else if (/当前状态：程序已提交，正等待编译。/.test(res)) {
                        dstDiv.innerHTML = divTemp('gray', 'PE');
                    } else {
                        Ajax.get(`${prefixURL}/submit.php?id=${problem_id}`,
                            res => {
                                if (/时间已到，您不能再提交程序了。/.test(res)) {
                                    ddl_list = ddl_list.concat(problem_id);
                                    localStorage["DDL_" + id] = JSON.stringify(ddl_list);
                                    dstDiv.innerHTML = divTemp('gray', 'DDL');
                                }
                            });
                    }
                });
        }
    }
}


function AddHistroysubmit(id) {
    // let his_list = !localStorage["HIS_" + id] ? [] : JSON.parse(localStorage["HIS_" + id]);
    // let ul = document.createElement('ul'), n = 1;
    // ul.setAttribute('class', 'nav nav-tabs');
    // for (let his_id of his_list.reverse()) {
    //     ul.innerHTML += `<li><a href="${location.origin + location.pathname +
    //         '?id=' + id}&submitid=${his_id}">第${n++}次</a></li>`;
    // }
    // document.getElementsByClassName('nav nav-tabs')[0].appendChild(ul);

    // // 全部存进去占空间太大了, 不存了
    // Ajax.get(`${prefixURL}/history.php?id=${id}`,
    //     res => {
    //         let doc = document.createElement('div')//, ul = document.createElement('ul');
    //         let submit_ids = []//, n = 1;
    //         doc.innerHTML = res;
    //         for (let histort_submit of doc.getElementsByClassName('submit')) {
    //             let history_id = histort_submit.getAttribute('submitid');
    //             if (his_list.indexOf(history_id) == -1) {
    //                 his_list.push(histort_submit.getAttribute('submitid'));
    //                 submit_ids.push(histort_submit.getAttribute('submitid'));
    //             }
    //         }

    //         // localStorage["HIS_" + id] = JSON.stringify(his_list);

    //         // ul.setAttribute('class', 'nav nav-tabs');
    //         for (let history_id of submit_ids.reverse()) {
    //             ul.innerHTML += `<li><a href="${location.origin + location.pathname + '?id=' + id}&submitid=${history_id}">第${n++}次</a></li>`;
    //         }
    //         //document.getElementsByClassName('nav nav-tabs')[0].appendChild(ul);
    //     });
    Ajax.get(`${prefixURL}/history.php?id=${id}`,
        res => {
            let doc = document.createElement('div'), ul = document.createElement('ul');
            let submit_ids = [], n = 1;
            doc.innerHTML = res;
            for (let histort_submit of doc.getElementsByClassName('submit')) {
                submit_ids.push(histort_submit.getAttribute('submitid'));
            }

            ul.setAttribute('class', 'nav nav-tabs');
            for (let history_id of submit_ids.reverse()) {
                ul.innerHTML += `<li><a href="${location.origin + location.pathname + '?id=' + id}&submitid=${history_id}">第${n++}次</a></li>`;
            }
            document.getElementsByClassName('nav nav-tabs')[0].appendChild(ul);
        });
}

function AddCopyToClipboard() {
    //let oldHTML = document.evaluate('//*[starts-with(@id, "action_link")]');
    let oldHTML = document.evaluate('//a[text()="下载"]', document, null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);

    // view页面没有"下载",因此手动添加
    if (!oldHTML.snapshotItem(0)) {
        for (let node of document.getElementsByClassName('showasplaintext small')) {
            let acopy = document.createElement('a');
            acopy.href = node.href;
            acopy.innerText = '复制';
            node.parentNode.insertBefore(acopy, node.parentNode.childNodes[1]);
            node.outerHTML += '&nbsp;';
        }
        oldHTML = document.evaluate('//a[text()="复制"]', document, null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
    }

    for (let i = 0; i < oldHTML.snapshotLength; i++) {
        let node = oldHTML.snapshotItem(i);
        node.innerText = '复制';
        node.href_bak = node.href;
        node.href = 'javascript:;';
        (node => { // 不知道该怎么称呼这种问题...反正用闭包解决
            node.onclick = () => {
                node.innerText = '请求中';
                Ajax.get(node.href_bak, res => {
                    GM_setClipboard(res);
                    node.innerText = '成功!';
                    setTimeout(() => {
                        node.innerText = '复制';
                    }, 1000);
                });
            };
        })(node);

        // 在迭代的时候修改node的属性会导致Error
        // https://stackoverflow.com/questions/23850984/selected-and-remove-all-matching-data-attributes
        // -------
        // 然而现在不用迭代了
    }
}

function AddHideCompileResults() {
    //居左 方便添加按钮
    cplResults = document.getElementsByClassName('box compilemessage')[0];
    if (!cplResults)
        return;

    cplResults.style.display = 'none';

    textResult = document.evaluate('//h3[text()="编译结果"]').iterateNext();
    textResult.style = 'float:left';

    button = document.createElement('button');
    button.innerText = '显示';
    //button.style = 'height:25px;width=180px;';
    button.onclick = () => {
        if (/none/.test(cplResults.style.display)) {
            cplResults.style.display = 'block';
            button.innerText = '隐藏';
        } else {
            cplResults.style.display = 'none';
            button.innerText = '显示';
        }
    };
    cplResults.parentElement.insertBefore(button, cplResults);
}


if (/programming\/view.php\?id=\d+/.test(location.toString())) {
    AddCopyToClipboard();

    // 增加历史提交情况,复制数据,隐藏编译结果
} else if (/programming\/(result|history).php\?id=\d+/.test(location.toString())) {
    if (/result/.test(location.toString()))
        AddHideCompileResults();

    let id = location.toString().match(/id=(\d+)/)[1]; // 页面id
    AddHistroysubmit(id);
    AddCopyToClipboard();

    // 隐藏 上传文件
} else if (/programming\/submit.php\?id=\d+/.test(location.toString())) {
    $('textarea').removeAttr('rows');
    $('textarea').removeAttr('cols');
    document.getElementsByClassName('fitem fitem_ffilepicker')[0].style = 'display:none';

    // 添加行号
    const TLN = {
        eventList: {},
        update_line_numbers: function(ta, el) {
            let lines = ta.value.split("\n").length;
            let child_count = el.children.length;
            let difference = lines - child_count;

            if(difference > 0) {
                let frag = document.createDocumentFragment();
                while(difference > 0) {
                    let line_number = document.createElement("span");
                    line_number.className = "tln-line";
                    frag.appendChild(line_number);
                    difference--;
                }
                el.appendChild(frag);
            }
            while(difference < 0) {
                el.removeChild(el.firstChild);
                difference++;
            }
        },
        append_line_numbers: function(id) {
            let ta = document.getElementById(id);
            if(ta == null) {
                return console.warn("[tln.js] Couldn't find textarea of id '"+id+"'");
            }
            if(ta.className.indexOf("tln-active") != -1) {
                return console.warn("[tln.js] textarea of id '"+id+"' is already numbered");
            }
            ta.classList.add("tln-active");
            ta.style = {};

            let el = document.createElement("div");
            ta.parentNode.insertBefore(el, ta);
            el.className = "tln-wrapper";
            TLN.update_line_numbers(ta, el);
            TLN.eventList[id] = [];

            const __change_evts = [
                "propertychange", "input", "keydown", "keyup"
            ];
            const __change_hdlr = function(ta, el) {
                return function(e) {
                    if((+ta.scrollLeft==10 && (e.keyCode==37||e.which==37
                                               ||e.code=="ArrowLeft"||e.key=="ArrowLeft"))
                       || e.keyCode==36||e.which==36||e.code=="Home"||e.key=="Home"
                       || e.keyCode==13||e.which==13||e.code=="Enter"||e.key=="Enter"
                       || e.code=="NumpadEnter")
                        ta.scrollLeft = 0;
                    TLN.update_line_numbers(ta, el);
                }
            }(ta, el);
            for(let i = __change_evts.length - 1; i >= 0; i--) {
                ta.addEventListener(__change_evts[i], __change_hdlr);
                TLN.eventList[id].push({
                    evt: __change_evts[i],
                    hdlr: __change_hdlr
                });
            }

            const __scroll_evts = [ "change", "mousewheel", "scroll" ];
            const __scroll_hdlr = function(ta, el) {
                return function() {  el.scrollTop = ta.scrollTop;  }
            }(ta, el);
            for(let i = __scroll_evts.length - 1; i >= 0; i--) {
                ta.addEventListener(__scroll_evts[i], __scroll_hdlr);
                TLN.eventList[id].push({
                    evt: __scroll_evts[i],
                    hdlr: __scroll_hdlr
                });
            }
        },
        remove_line_numbers: function(id) {
            let ta = document.getElementById(id);
            if(ta == null) {
                return console.warn("[tln.js] Couldn't find textarea of id '"+id+"'");
            }
            if(ta.className.indexOf("tln-active") == -1) {
                return console.warn("[tln.js] textarea of id '"+id+"' isn't numbered");
            }
            ta.classList.remove("tln-active");

            ta.previousSibling.remove();

            if(!TLN.eventList[id]) return;
            for(let i = TLN.eventList[id].length - 1; i >= 0; i--) {
                const evt = TLN.eventList[id][i];
                ta.removeEventListener(evt.evt, evt.hdlr);
            }
            delete TLN.eventList[id];
        }
    }

    TLN.append_line_numbers('id_code');

} else if (/course\/view.php\?id=\d+/.test(location.toString())) {
    let id = location.toString().match(/id=(\d+)/)[1]; // 页面id

    // 储存锚点  (似乎放在RefreshACStatus后面会bug)
    RefreshLabels(id);

    // 更新AC状态
    RefreshACStatus(id);

    // 增加 "自己的AC数"
    AddMyACCount(id);

}
// 增加点击日期跳转
if (/mod\/programming\//.test(location.toString())) {
    AddClickBack();
}


// TODO:获取提交次数
function get_submit_cnt(id) {
    return s.match(/submit="\d+"/).length;
}

 
