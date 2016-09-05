﻿// 刷新策略
var refreshStrategy = {
    exts:{
        refresh: function(each){
            if (Ext.prototype.isWhite(each)) return true;
            return false;
        }
    }
    , white:{
        refresh: function(each){
            if (!Ext.prototype.isWhite(each)) return true;
            return false;
        }
    }
}

// 列表类
function List(listEle) {

    var _thisList = this;
    var _elements = [];
    var _refresh  = function(ext, strategy) {     // 被更改后重组界面，不采取全部重刷的方法

        // 通过遍历先取到当前更新后的所在位置，然后再在list和dom里面进行同步
        chrome.management.getAll(function (result) {
            var each, extIndex = 0;// 因为result包含了app和ext
            for(var i in result){
                each = result[i];
                if (isBlocked(each)) continue;
                // 是被禁用的操作
                if (strategy.refresh(each)) {
                    continue;
                }
                if (each.id==ext.getId()){
                    break;
                 }                    
                extIndex++;
            }
            _thisList.remove(ext);
            _thisList.insert(extIndex, new Ext(each));
        });
    };
    var _getSelectedExt  = function(selectedEle) {     // 获取选择的Ext节点
        return _elements[Array.prototype.indexOf.call(listEle.childNodes, selectedEle)];
    };

    // 列表添加鼠标行为
    listEle.onmouseup     = function(e) {
        if(e.target.nodeName == 'LI') {
            var strategy = refreshStrategy.exts;
            if(listEle.id.indexOf('white') >= 0){
                strategy = refreshStrategy.white;
            }
            _getSelectedExt(e.srcElement).onmouseup(e.button, e.shiftKey, _refresh, strategy);
        }
        return false;
    };
    
    // 禁止右键菜单
    listEle.oncontextmenu = function() {
        return false;
    };
    
    // 悬浮
    listEle.onmouseover   = function(e) {
        if(e.target.nodeName == 'LI'){
            _getSelectedExt(e.srcElement).onmouseover();
        }
        return false;
    };

    // 移开
    listEle.onmouseout = function(e) {
        if(e.target.nodeName == 'LI'){
            _getSelectedExt(e.srcElement).onmouseout();
        }
        return false;
    };


    //--------------public--------------
    // 添加对象
    _thisList.append = function(element) {
        listEle.appendChild(element.getHTML());
        _elements.push(element);
    };
    // 删除对象
    _thisList.remove = function(element) {
        listEle.removeChild(element.getHTML());
        _elements.splice(_elements.indexOf(element), 1);
    };
    // 插入对象
    _thisList.insert = function(i, element) {
        var nextEle = _elements[i];
        if(nextEle) {
            listEle.insertBefore(element.getHTML(), nextEle.getHTML());
        } else {
            // 是最后的节点
            listEle.appendChild(element.getHTML());
        }
        _elements.splice(i, 0, element);// insert
    };

        
    // 显示列表
    _thisList.show = function() {
        var className = listEle.className;
        if ( _thisList.isHidden()) {
            listEle.className = listEle.className.replace(' hide ', '');
        }
        return _thisList;
    };

    _thisList.isShown = function() {
        if (listEle.className.indexOf('hide') < 0) { // 没有hide class
            return true;
        }
        return false;
    };

    _thisList.isHidden = function() {
        return !_thisList.isShown();
    };

    // 隐藏列表
    _thisList.hide = function() {
        if (_thisList.isShown()) {
            listEle.className = listEle.className.concat(' hide ');
        }
        return _thisList;
    };
}

// 单个扩展对象类
function Ext(extData) {

    var _thisExt         = this;
    var _obj             = document.createElement("li");
    var _iconPath        = extData.icons   ? extData.icons[0].url    : 'icon/default_icon.png';
    var _hoveredIconPath = extData.enabled ? 'icon/disabled.png' : 'icon/enabled.png';

    _obj.id        = extData.id;
    _obj.title     = chrome.i18n.getMessage("rightclicktouninstallthis");
    _obj.style     = "background-image:url("+ _iconPath +")";
    _obj.className = extData.enabled ? 'enabled' : 'disabled';
    _obj.innerHTML = extData.name;

    //--------------public--------------
    // 被左右键点击
    _thisExt.onmouseup = function(btnType, isShiftKey, callback, strategy) {
        // api中的回调函数无法传参，加个代理
        var callbackProxy = function(){
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
            } else {
                callback(_thisExt, strategy);
            }            
        }
        // 白名单操作
        if       (isShiftKey){ 
             _thisExt.setWhite(!_thisExt.isWhite());
            location.reload();
            return;
        }
        if       (btnType == 2) { // 右键卸载
            chrome.management.uninstall (extData.id, callbackProxy);
            // 删去白名单列表的数据
            localStorage.removeItem(extData.id);
        } else if(btnType == 0) { // 左键开启/禁用
            chrome.management.setEnabled(extData.id, !extData.enabled, callbackProxy);
        }
        return _thisExt;
    };
    
    // 被悬浮
    _thisExt.onmouseover = function() {
        _obj.style.backgroundImage = "url(" + _hoveredIconPath + ")";
        return _thisExt;
    };
    
    // 被移走
    _thisExt.onmouseout = function() {
        _obj.style.backgroundImage = "url(" + _iconPath + ")";
        return _thisExt;
    };
    
    // 显示节点
    _thisExt.show = function() {
        var className = _obj.className;
        if (className.indexOf('hide') >= 0) { // 有hide class
            _obj.className = className.replace(' hide ', '');
        }
        return _thisExt;
    };

    // 隐藏节点
    _thisExt.hide = function() {
        var className = _obj.className;
        if (className.indexOf('hide') < 0) { // 没有hide class
            _obj.className = className.concat(' hide ');
        }
        return _thisExt;
    };
    
    // 获取html
    _thisExt.getHTML = function() {
        return _obj;
    };
    
    // 获取id
    _thisExt.getId = function() {
        return extData.id;
    };
    
    // 是否处于白名单
    _thisExt.isWhite = function() {
        return localStorage.getItem(extData.id)=='W' ? true : false;
    };

    // 设置白名单
    _thisExt.setWhite = function(isWhite) {
        localStorage.setItem(extData.id, isWhite?'W':'');
    };

}

// 判断是否是白名单
Ext.prototype.isWhite = function (extData) {
    return localStorage.getItem(extData.id)=='W' ? true : false;
}

function isBlocked(element) {
    if(element.name === chrome.i18n.getMessage("extname") || element.isApp) {
        return true;
    }
    return false;
}

// 清除已经删除的扩展。在每次进行初始化的时候扫描（因为有在扩展页删除的可能）
// W是白名单, D是已经被删除的扩展
function delNullInWhite() {
    var storage=localStorage.valueOf();
    for(var key in storage){
        if(storage[key]=='D'){
            localStorage.removeItem(key);
        }
    }
}

(function init() {
    var $ = function(id){return document.getElementById(id);};
    var extList   = new List($('extensions_list')).hide();
    var whiteList = new List($('white_list')).hide();

    var link = $('open_exts_manager');
    link.onclick=function(){
        chrome.tabs.create({
            url: "chrome://extensions/"
        });
    }

    var openWhiteBtn = $('open_white');
    openWhiteBtn.onclick=function(){
        var t = openWhiteBtn.className;
        // 上部的按钮
        if (t.indexOf('showpic') >= 0){
            openWhiteBtn.className = t.replace('showpic', 'hidepic');
            openWhiteBtn.innerHTML='隐藏白名单';
        } else {
            openWhiteBtn.className = t.replace('hidepic', 'showpic');
            openWhiteBtn.innerHTML='显示白名单';
        }
        // 白名单标题
        var wEle = $('white_title');
        t = wEle.className;
        if (t.indexOf('hide') >= 0){
            wEle.className = t.replace('hide', 'show');            
        } else {
            wEle.className = t.replace('show', 'hide');
        }

        // 白名单列表
        if(whiteList.isShown()){
            whiteList.hide();
        } else {
            whiteList.show();
        }
    }
    
    chrome.management.getAll(function (result) {
        var each = undefined;
        for(var i in result) {
            each = result[i];
            // 屏蔽自身以及应用
            if (isBlocked(each)) continue;
            // 登录列表中没有的扩展
            if (localStorage.getItem(each.id)==null){
                localStorage.setItem(each.id, '');
            }
            if (Ext.prototype.isWhite(each)) {
                whiteList.append(new Ext(each));    
            } else {
                extList.append(new Ext(each));                
            }            
        }      
        delNullInWhite();
        extList.show();
    });
}) ();

