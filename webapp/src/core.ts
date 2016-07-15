/// <reference path="../../typings/react/react.d.ts" />
/// <reference path="../../typings/react/react-dom.d.ts" />
/// <reference path="../../built/pxtlib.d.ts" />

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as workspace from "./workspace";
import * as data from "./data";
import * as pkg from "./package";

import Cloud = pxt.Cloud;
import Util = pxt.Util;

const lf = Util.lf;

export type Component<S, T> = data.Component<S, T>;

export function hideLoading() {
    $('.ui.page.dimmer .loadingcontent').remove();
    $('body').dimmer('hide');
}

export function showLoading(msg: string) {
    $('body').dimmer('show');
    $('.ui.page.dimmer').html(`
  <div class="content loadingcontent">
    <div class="ui text large loader msg">{lf("Please wait")}</div>
  </div>
`)
    $('.ui.page.dimmer .msg').text(msg)
}

export function navigateInWindow(url: string) {
    window.location.href = url;
}

export function findChild(c: React.Component<any, any>, selector: string) {
    let self = $(ReactDOM.findDOMNode(c))
    if (!selector) return self
    return self.find(selector)
}

export function parseQueryString(qs: string) {
    let r: Util.StringMap<string> = {}
    qs.replace(/\+/g, " ").replace(/([^&=]+)=?([^&]*)/g, (f: string, k: string, v: string) => {
        r[decodeURIComponent(k)] = decodeURIComponent(v)
        return ""
    })
    return r
}

let lastTime: any = {}

function htmlmsg(kind: string, msg: string) {
    let now = Date.now()
    let prev = lastTime[kind] || 0
    if (now - prev < 100)
        $('#' + kind + 'msg').text(msg);
    else {
        lastTime[kind] = now
        $('#' + kind + 'msg').finish().text(msg).fadeIn('fast').delay(3000).fadeOut('slow');
    }
}

export function errorNotification(msg: string) {
    pxt.reportError(msg, undefined)
    htmlmsg("err", msg)
}

export function warningNotification(msg: string) {
    pxt.log("warning: ", msg)
    htmlmsg("warn", msg)
}

export function infoNotification(msg: string) {
    pxt.debug(msg)
    htmlmsg("info", msg)
}

export function handleNetworkError(e: any) {
    let statusCode = <number>e.status
    if (e.isOffline) {
        warningNotification(lf("Network request failed; you appear to be offline"))
    } else {
        throw e;
    }
}

export interface ButtonConfig {
    label: string;
    icon?: string; // defaults to "checkmark"
    class?: string; // defaults "positive"
    onclick?: () => (Promise<void> | void);
}

export interface ConfirmOptions extends DialogOptions {
    agreeLbl?: string;
    agreeIcon?: string;
    agreeClass?: string;
    hideAgree?: boolean;
    deleteLbl?: string;
}

export interface DialogOptions {
    hideCancel?: boolean;
    disagreeLbl?: string;
    logos?: string[];
    header: string;
    body?: string;
    htmlBody?: string;
    onLoaded?: (_: JQuery) => void;
    buttons?: ButtonConfig[];
}

export function dialogAsync(options: DialogOptions): Promise<void> {
    let logos = (options.logos || [])
        .filter(logo => !!logo)
        .map(logo => `<img class="ui logo" src="${Util.toDataUri(logo)}" />`)
        .join(' ');
    let html = `
  <div class="ui small modal">
    <div class="header">
        ${Util.htmlEscape(options.header)}      
    </div>
    <div class="content">
      ${options.body ? "<p>" + Util.htmlEscape(options.body) + "</p>" : ""}
      ${options.htmlBody || ""}
    </div>`
    html += `<div class="actions">`
    html += logos

    if (!options.hideCancel) {
        options.buttons.push({
            label: options.disagreeLbl || lf("Cancel"),
            class: "cancel",
            icon: "cancel"
        })
    }

    let btnno = 0
    for (let b of options.buttons) {
        html += `
      <button class="ui right labeled icon button approve ${b.class || "positive"}" data-btnid="${btnno++}">
        ${Util.htmlEscape(b.label)}
        <i class="${b.icon || "checkmark"} icon"></i>
      </button>`
    }

    html += `</div>`
    html += `</div>`

    let modal = $(html)
    let done = false
    $('#root').append(modal)
    if (options.onLoaded) options.onLoaded(modal)

    modal.find('img').on('load', () => {
        modal.modal('refresh')
    })

    return new Promise<void>((resolve, reject) => {
        let onfinish = (elt: JQuery) => {
            if (!done) {
                done = true
                let id = elt.attr("data-btnid")
                if (id) {
                    let btn = options.buttons[+id]
                    if (btn.onclick)
                        return resolve(btn.onclick())
                }
                return resolve()
            }
        }
        modal.modal({
            observeChanges: true,
            closeable: !options.hideCancel,
            onHidden: () => {
                modal.remove()
            },
            onApprove: onfinish,
            onDeny: onfinish,
            onHide: () => {
                if (!done) {
                    done = true
                    resolve()
                }
            },
        }).modal("show")
    })
}

export function confirmAsync(options: ConfirmOptions): Promise<boolean> {
    if (!options.buttons) options.buttons = []

    let result = false

    if (options.deleteLbl) {
        options.buttons.push({
            label: options.deleteLbl,
            class: "delete red",
            icon: "delete"
        })
    }

    if (!options.hideAgree) {
        options.buttons.push({
            label: options.agreeLbl || lf("Go ahead!"),
            class: options.agreeClass,
            icon: options.agreeIcon,
            onclick: () => {
                result = true
            }
        })
    }

    return dialogAsync(options)
        .then(() => result)
}

export function confirmDelete(what: string, cb: () => Promise<void>) {
    confirmAsync({
        header: lf("Would you like to delete '{0}'?", what),
        body: lf("It will be deleted for good. No undo."),
        agreeLbl: lf("Delete"),
        agreeClass: "red",
        agreeIcon: "trash",
    }).then(res => {
        if (res) {
            cb().done()
        }
    }).done()
}

export interface ShareOptions {
    header: string;
    body?: string;
    link: string;
    okClass?: string;
    okIcon?: string;
    okLabel?: string;
}

export function shareLinkAsync(options: ShareOptions) {
    let html = `
  <div class="ui small modal">
    <div class="header">
        ${Util.htmlEscape(options.header)}      
    </div>
    <div class="content">    
      <p>${Util.htmlEscape(options.body || "")}</p>
      <div class="ui fluid action input">
         <input class="linkinput" type="text" value="${Util.htmlEscape(options.link)}">
         <button class="ui teal right labeled icon button copybtn" data-content="${lf("Copied!")}">
            ${lf("Copy")}
            <i class="copy icon"></i>
         </button>
      </div>
    </div>
    <div class="actions">
      <div class="ui approve right labeled icon button ${options.okClass || "teal"}">
        ${Util.htmlEscape(options.okLabel || lf("OK"))}
        <i class="${options.okIcon || "checkmark"} icon"></i>
      </div>
    </div>
  </div>
  `
    let modal = $(html)
    let btn = modal.find('.copybtn')
    btn.click(() => {
        let inp = modal.find('.linkinput');
        (inp[0] as HTMLInputElement).setSelectionRange(0, inp.val().length);
        try {
            document.execCommand("copy");
            btn.popup({
                on: "manual",
                inline: true
            })
            btn.popup("show")
        } catch (e) {
        }
    })
    let done = false
    $('body').append(modal)

    return new Promise((resolve, reject) =>
        modal.modal({
            onHidden: () => {
                modal.remove()
            },
            onHide: () => {
                if (!done) {
                    done = true
                    resolve(false)
                }
            },
        }).modal("show"))
}

export function scrollIntoView(item: JQuery, margin = 0) {
    if (!item.length) return;

    let parent = item.offsetParent();

    let itemTop = Math.max(item.position().top - margin, 0);
    let itemBottom = item.position().top + item.outerHeight(true) + margin;
    let selfTop = $(parent).scrollTop();
    let selfH = $(parent).height();
    let newTop = selfTop;

    if (itemTop < selfTop) {
        newTop = itemTop;
    } else if (itemBottom > selfTop + selfH) {
        newTop = itemBottom - selfH;
    }

    if (newTop != selfTop) {
        parent.scrollTop(newTop)
        //parent.animate({ 'scrollTop': newTop }, 'fast');
    }
}

// for JavaScript console
export function apiAsync(path: string, data?: any) {
    return (data ?
        Cloud.privatePostAsync(path, data) :
        Cloud.privateGetAsync(path))
        .then(resp => {
            console.log("*")
            console.log("*******", path, "--->")
            console.log("*")
            console.log(resp)
            console.log("*")
            return resp
        }, err => {
            console.log(err.message)
        })
}
