namespace pxsim.svg {
    let pt: SVGPoint;
    export function cursorPoint(pt: SVGPoint, svg: SVGSVGElement, evt: MouseEvent): SVGPoint {
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        return pt.matrixTransform(svg.getScreenCTM().inverse());
    }

    export function rotateElement(el: SVGElement, originX: number, originY: number, degrees: number) {
        el.setAttribute(
            'transform',
            `translate(${originX},${originY}) rotate(${degrees + 90}) translate(${-originX},${-originY})`
        );
    }

    export function addClass(el: SVGElement, cls: string) {
        if (el.classList) el.classList.add(cls);
        else if (!el.className.baseVal.indexOf(cls)) el.className.baseVal += ' ' + cls;
    }

    export function removeClass(el: SVGElement, cls: string) {
        if (el.classList) el.classList.remove(cls);
        else el.className.baseVal = el.className.baseVal.replace(cls, '').replace(/\s{2,}/, ' ');
    }

    export function elt(name: string): SVGElement {
        return document.createElementNS("http://www.w3.org/2000/svg", name)
    }

    export function hydrate(el: SVGElement, props: any) {
        for (let k in props) {
            if (k == "title") {
                svg.title(el, props[k])
            } else el.setAttributeNS(null, k, props[k])
        }
    }

    export function child(parent: Element, name: string, props?: any): SVGElement {
        let el = <SVGElement>svg.elt(name);
        if (props)
            svg.hydrate(el, props);
        parent.appendChild(el);
        return el;
    }

    export function path(parent: Element, cls: string, data: string, title?: string): SVGElement {
        let el = mkPath(cls, data, title);
        parent.appendChild(el);
        return el;
    }

    export function mkPath(cls: string, data: string, title?: string): SVGPathElement {
        let p: any = { class: cls, d: data };
        if (title) p["title"] = title;
        let el = <SVGPathElement>svg.elt("path");
        svg.hydrate(el, p);
        return el;
    }

    export function fill(el: SVGElement, c: string) {
        (<SVGStylable><any>el).style.fill = c;
    }

    export function fills(els: SVGElement[], c: string) {
        els.forEach(el => (<SVGStylable><any>el).style.fill = c);
    }

    export function buttonEvents(el: Element,
        move: (ev: MouseEvent) => void,
        start?: (ev: MouseEvent) => void,
        stop?: (ev: MouseEvent) => void) {
        let captured = false;
        el.addEventListener('mousedown', (ev: MouseEvent) => {
            captured = true;
            if (start) start(ev)
            return true;
        });
        el.addEventListener('mousemove', (ev: MouseEvent) => {
            if (captured) {
                move(ev);
                ev.preventDefault();
                return false;
            }
            return true;
        });
        el.addEventListener('mouseup', (ev: MouseEvent) => {
            captured = false;
            if (stop) stop(ev);
        });
        el.addEventListener('mouseleave', (ev: MouseEvent) => {
            captured = false;
            if (stop) stop(ev);
        });
    }

    export function linearGradient(defs: SVGDefsElement, id: string): SVGLinearGradientElement {
        let gradient = <SVGLinearGradientElement>svg.child(defs, "linearGradient", { id: id, x1: "0%", y1: "0%", x2: "0%", y2: "100%" });
        let stop1 = svg.child(gradient, "stop", { offset: "0%" })
        let stop2 = svg.child(gradient, "stop", { offset: "100%" })
        let stop3 = svg.child(gradient, "stop", { offset: "100%" })
        let stop4 = svg.child(gradient, "stop", { offset: "100%" })
        return gradient;
    }

    export function setGradientColors(lg: SVGLinearGradientElement, start: string, end: string) {
        if (!lg) return;

        (<SVGStopElement>lg.childNodes[0]).style.stopColor = start;
        (<SVGStopElement>lg.childNodes[1]).style.stopColor = start;
        (<SVGStopElement>lg.childNodes[2]).style.stopColor = end;
        (<SVGStopElement>lg.childNodes[3]).style.stopColor = end;
    }

    export function setGradientValue(lg: SVGLinearGradientElement, percent: string) {
        (<SVGStopElement>lg.childNodes[1]).setAttribute("offset", percent);
        (<SVGStopElement>lg.childNodes[2]).setAttribute("offset", percent);
    }

    export function animate(el: SVGElement, cls: string) {
        svg.addClass(el, cls);
        let p = el.parentElement;
        p.removeChild(el);
        p.appendChild(el)
    }

    export function title(el: SVGElement, txt: string) {
        let t = svg.child(el, "title", {});
        t.textContent = txt;
    }
}