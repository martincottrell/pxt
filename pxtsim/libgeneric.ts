namespace pxt.rt {
    // A ref-counted collection of either primitive or ref-counted objects (String, Image,
    // user-defined record, another collection)
    export class RefCollection extends RefObject {
        data: any[] = [];

        // 1 - collection of refs (need decr)
        // 2 - collection of strings (in fact we always have 3, never 2 alone)
        constructor(public flags: number) {
            super();
        }

        destroy() {
            let data = this.data
            if (this.flags & 1)
                for (let i = 0; i < data.length; ++i) {
                    decr(data[i]);
                    data[i] = 0;
                }
            this.data = [];
        }

        print() {
            console.log(`RefCollection id:${this.id} refs:${this.refcnt} len:${this.data.length} flags:${this.flags} d0:${this.data[0]}`)
        }
    }



    export namespace Array_ {
        export function mk(f: number) {
            return new RefCollection(f);
        }

        export function length(c: RefCollection) {
            return c.data.length;
        }

        export function push(c: RefCollection, x: any) {
            if (c.flags & 1) incr(x);
            c.data.push(x);
        }

        export function in_range(c: RefCollection, x: number) {
            return (0 <= x && x < c.data.length);
        }

        export function getAt(c: RefCollection, x: number) {
            if (in_range(c, x)) {
                let tmp = c.data[x];
                if (c.flags & 1) incr(tmp);
                return tmp;
            }
            else {
                check(false);
            }
        }

        export function removeAt(c: RefCollection, x: number) {
            if (!in_range(c, x))
                return;

            if (c.flags & 1) decr(c.data[x]);
            c.data.splice(x, 1)
        }

        export function setAt(c: RefCollection, x: number, y: any) {
            if (!in_range(c, x))
                return;

            if (c.flags & 1) {
                decr(c.data[x]);
                incr(y);
            }
            c.data[x] = y;
        }

        export function indexOf(c: RefCollection, x: any, start: number) {
            if (!in_range(c, start))
                return -1;
            return c.data.indexOf(x, start)
        }

        export function removeElement(c: RefCollection, x: any) {
            let idx = indexOf(c, x, 0);
            if (idx >= 0) {
                removeAt(c, idx);
                return 1;
            }
            return 0;
        }
    }

    export namespace Math_ {
        export function sqrt(n: number) {
            return Math.sqrt(n) >>> 0;
        }
        export function pow(x: number, y: number) {
            return Math.pow(x, y) >>> 0;
        }
        export function random(max: number): number {
            if (max < 1) return 0;
            var r = 0;
            do {
                r = Math.floor(Math.random() * max);
            } while (r == max);
            return r;
        }
    }

    // for explanations see:
    // http://stackoverflow.com/questions/3428136/javascript-integer-math-incorrect-results (second answer)
    // (but the code below doesn't come from there; I wrote it myself)
    // TODO use Math.imul if available
    function intMult(a: number, b: number) {
        return (((a & 0xffff) * (b >>> 16) + (b & 0xffff) * (a >>> 16)) << 16) + ((a & 0xffff) * (b & 0xffff));
    }

    export namespace Number_ {
        export function lt(x: number, y: number) { return x < y; }
        export function le(x: number, y: number) { return x <= y; }
        export function neq(x: number, y: number) { return x != y; }
        export function eq(x: number, y: number) { return x == y; }
        export function gt(x: number, y: number) { return x > y; }
        export function ge(x: number, y: number) { return x >= y; }
        export function div(x: number, y: number) { return Math.floor(x / y) | 0; }
        export function mod(x: number, y: number) { return x % y; }
        export function toString(x: number) { return initString(x + ""); }
    }

    export namespace thumb {
        export function adds(x: number, y: number) { return (x + y) | 0; }
        export function subs(x: number, y: number) { return (x - y) | 0; }
        export function divs(x: number, y: number) { return Math.floor(x / y) | 0; }
        export function muls(x: number, y: number) { return intMult(x, y); }
        export function ands(x: number, y: number) { return x & y; }
        export function orrs(x: number, y: number) { return x | y; }
        export function eors(x: number, y: number) { return x ^ y; }
        export function lsls(x: number, y: number) { return x << y; }
        export function lsrs(x: number, y: number) { return x >>> y; }
        export function asrs(x: number, y: number) { return x >> y; }

        export function cmp_lt(x: number, y: number) { return x < y; }
        export function cmp_le(x: number, y: number) { return x <= y; }
        export function cmp_ne(x: number, y: number) { return x != y; }
        export function cmp_eq(x: number, y: number) { return x == y; }
        export function cmp_gt(x: number, y: number) { return x > y; }
        export function cmp_ge(x: number, y: number) { return x >= y; }
    }

    export namespace String_ {
        export function mkEmpty() {
            return ""
        }

        export function fromCharCode(code: number) {
            return String.fromCharCode(code)
        }

        export function toNumber(s: string) {
            return parseInt(s);
        }
        
        // TODO check edge-conditions

        export function concat(a: string, b: string) {
            return initString(a + b);
        }

        export function substring(s: string, i: number, j: number) {
            return initString(s.slice(i, i + j));
        }

        export function equals(s1: string, s2: string) {
            return s1 == s2;
        }

        export function compare(s1: string, s2: string) {
            if (s1 == s2) return 0;
            if (s1 < s2) return -1;
            return 1;
        }

        export function length(s: string) {
            return s.length
        }

        function inRange(s: string, i: number) { return 0 <= i && i < s.length }

        export function charAt(s: string, i: number) {
            return inRange(s, i) ? initString(s.charAt(i)) : null;
        }

        export function charCodeAt(s: string, i: number) {
            return inRange(s, i) ? s.charCodeAt(i) : 0;
        }
    }

    export namespace Boolean_ {
        export function toString(v: boolean) {
            return v ? "true" : "false"
        }
        export function bang(v: boolean) {
            return !v;
        }
    }


    export class RefBuffer extends RefObject {
        constructor(public data: Uint8Array) {
            super();
        }

        print() {
            console.log(`RefBuffer id:${this.id} refs:${this.refcnt} len:${this.data.length} d0:${this.data[0]}`)
        }
    }
    
    export namespace BufferMethods {
        export function createBuffer(size:number) {
            return new RefBuffer(new Uint8Array(size));
        }
        
        export function getBytes(buf:RefBuffer) {
            // not sure if this is any useful...
            return buf.data;
        }
        
        function inRange(buf: RefBuffer, off: number) {
            return 0 <= off && off < buf.data.length
        }

        export function getByte(buf: RefBuffer, off: number) {
            if (inRange(buf, off)) return buf.data[off]
            else return 0;
        }

        export function setByte(buf: RefBuffer, off: number, v: number) {
            if (inRange(buf, off)) buf.data[off] = v
        }

        export function length(buf: RefBuffer) {
            return buf.data.length
        }

        export function fill(buf: RefBuffer, value: number, offset: number = 0, length: number = -1) {
            if (offset < 0 || offset > buf.data.length)
                return;
            if (length < 0)
                length = buf.data.length;
            length = Math.min(length, buf.data.length - offset);

            buf.data.fill(value, offset, offset + length)
        }

        export function slice(buf: RefBuffer, offset: number, length: number) {
            offset = Math.min(buf.data.length, offset);
            if (length < 0)
                length = buf.data.length;
            length = Math.min(length, buf.data.length - offset);
            return new RefBuffer(buf.data.slice(offset, offset + length));
        }

        function memmove(dst: Uint8Array, dstOff: number, src: Uint8Array, srcOff: number, len: number) {
            if (src.buffer === dst.buffer) {
                memmove(dst, dstOff, src.slice(srcOff, srcOff + len), 0, len);
            } else {
                for (let i = 0; i < len; ++i)
                    dst[dstOff + i] = src[srcOff + i];
            }
        }

        const INT_MIN = -0x80000000;

        export function shift(buf: RefBuffer, offset: number) {
            if (buf.data.length == 0 || offset == 0 || offset == INT_MIN) return;
            if (offset <= -buf.data.length || offset >= buf.data.length) {
                fill(buf, 0);
                return;
            }

            if (offset < 0) {
                offset = -offset;
                memmove(buf.data, offset, buf.data, 0, buf.data.length - offset);
                buf.data.fill(0, 0, offset)
            } else {
                let len = buf.data.length - offset;
                memmove(buf.data, 0, buf.data, offset, len);
                buf.data.fill(0, len, len + offset)
            }
        }

        export function rotate(buf: RefBuffer, offset: number) {
            let len = buf.data.length;

            if (len == 0 || offset == 0 || offset == INT_MIN) return;

            if (offset < 0)
                offset += len << 8; // try to make it positive
            offset %= len;
            if (offset < 0)
                offset += len;

            let data = buf.data
            let n_first = offset
            let first = 0
            let next = n_first
            let last = len

            while (first != next) {
                let tmp = data[first]
                data[first++] = data[next]
                data[next++] = tmp
                if (next == last) {
                    next = n_first;
                } else if (first == n_first) {
                    n_first = next;
                }
            }
        }

        export function write(buf: RefBuffer, dstOffset: number, src: RefBuffer, srcOffset = 0, length = -1) {
            if (length < 0)
                length = src.data.length;

            if (srcOffset < 0 || dstOffset < 0 || dstOffset > buf.data.length)
                return;

            length = Math.min(src.data.length - srcOffset, buf.data.length - dstOffset);

            if (length < 0)
                return;

            memmove(buf.data, dstOffset, src.data, srcOffset, length)
        }
    }

}