const SVG_NS = "http://www.w3.org/2000/svg";

export function h(tag, attrs = {}, ...children) {
    const el = tag.startsWith("svg:")
        ? document.createElementNS(SVG_NS, tag.slice(4))
        : document.createElement(tag);

    for (const [key, value] of Object.entries(attrs || {})) {
        if (value === false || value == null) continue;
        if (key === "class") el.setAttribute("class", value);
        else if (key === "style") el.style.cssText = value;
        else if (key.startsWith("data-") || key.startsWith("aria-") || tag.startsWith("svg:")) el.setAttribute(key, value);
        else if (key in el) el[key] = value;
        else el.setAttribute(key, value);
    }

    for (const child of children.flat(Infinity)) {
        if (child == null || child === false) continue;
        el.append(child.nodeType ? child : document.createTextNode(String(child)));
    }

    return el;
}

