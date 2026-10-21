// Removes the litter bin and the graffiti with the Clone Stamp tool only.
// Each pass sets a clone source (the scripted Option-click) and strokes a path
// with the Clone Stamp. The wall is cloned in bands, one per mortar line, so
// that the courses of stone stay continuous through the repair.
#target photoshop
app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

var dir = "/Users/sowmi-zstch1630/Pictures/ps-promenade";
var doc = app.open(new File(dir + "/source.png"));
var bg = doc.layers[doc.layers.length - 1];
var PT = 72 / doc.resolution; // path coordinates are in points

function cID(s) { return charIDToTypeID(s); }
function sID(s) { return stringIDToTypeID(s); }

function selectCloneStamp() {
    var r = new ActionReference(); r.putClass(sID("cloneStampTool"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    executeAction(cID("slct"), d, DialogModes.NO);
}

function setBrush(diameter, hardness) {
    var r = new ActionReference(); r.putEnumerated(cID("Brsh"), cID("Ordn"), cID("Trgt"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var b = new ActionDescriptor();
    b.putUnitDouble(sID("masterDiameter"), cID("#Pxl"), diameter);
    b.putUnitDouble(cID("Hrdn"), cID("#Prc"), hardness);
    b.putUnitDouble(cID("Spcn"), cID("#Prc"), 10);
    d.putObject(cID("T   "), cID("Brsh"), b);
    try { executeAction(cID("setd"), d, DialogModes.NO); } catch (e) {}
}

// Option-click: set the clone source on the active layer.
function setSource(x, y) {
    var r = new ActionReference();
    r.putProperty(cID("Prpr"), sID("cloneSource"));
    r.putEnumerated(cID("capp"), cID("Ordn"), cID("Trgt"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var lr = new ActionReference(); lr.putEnumerated(cID("Lyr "), cID("Ordn"), cID("Trgt"));
    var to = new ActionDescriptor(); to.putReference(sID("source"), lr);
    var p = new ActionDescriptor();
    p.putUnitDouble(cID("Hrzn"), cID("#Pxl"), x);
    p.putUnitDouble(cID("Vrtc"), cID("#Pxl"), y);
    to.putObject(sID("position"), cID("Pnt "), p);
    d.putObject(cID("T   "), sID("imageCachePreferences"), to);
    executeAction(cID("setd"), d, DialogModes.NO);
}

function strokeWithCloneStamp(points) {
    var pts = [];
    for (var i = 0; i < points.length; i++) {
        var q = new PathPointInfo(), a = [points[i][0] * PT, points[i][1] * PT];
        q.kind = PointKind.CORNERPOINT; q.anchor = a; q.leftDirection = a; q.rightDirection = a;
        pts.push(q);
    }
    var sp = new SubPathInfo();
    sp.operation = ShapeOperation.SHAPEADD; sp.closed = false; sp.entireSubPath = pts;
    var path = doc.pathItems.add("cloneStroke", [sp]);
    var r = new ActionReference(); r.putName(cID("Path"), "cloneStroke");
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    d.putClass(cID("Usng"), sID("cloneStampTool"));
    d.putBoolean(cID("Prs "), false);
    executeAction(cID("Strk"), d, DialogModes.NO);
    path.remove();
}

// Wall lines measured on the photo: y = y360 + slope * (x - 360).
function line(y360, slope) { return function (x) { return y360 + slope * (x - 360); }; }
function mid(a, b) { return function (x) { return (a(x) + b(x)) / 2; }; }
function shift(a, dy) { return function (x) { return a(x) + dy; }; }
function flat(y) { return function () { return y; }; }

var BACK = line(478.0, -0.050); // back edge of the coping, against the sea
var TOP  = line(498.4, -0.057); // front edge of the coping
var L1   = line(537.0, -0.103); // coping / first course
var L2   = line(603.3, -0.119); // first / second course
var L3   = line(673.3, -0.135); // second / third course
var BASE = line(738.3, -0.143); // wall / pavement

// Fill the band between top(x) and bottom(x), x in [x0, x1], with a
// serpentine Clone Stamp stroke copying from (x + offX, y + offY).
var BRUSH = 22;
function cloneBand(top, bottom, x0, x1, offX, offY) {
    var inset = BRUSH * 0.3, rows = [], pts = [];
    var h = Math.max(bottom(x0) - top(x0), bottom(x1) - top(x1)) - 2 * inset;
    var n = Math.max(1, Math.ceil(h / (BRUSH * 0.4)));
    for (var k = 0; k <= n; k++) {
        var t = k / n;
        var ya = top(x0) + inset + t * (bottom(x0) - top(x0) - 2 * inset);
        var yb = top(x1) + inset + t * (bottom(x1) - top(x1) - 2 * inset);
        if (k % 2 == 0) { pts.push([x0, ya]); pts.push([x1, yb]); }
        else { pts.push([x1, yb]); pts.push([x0, ya]); }
    }
    setSource(pts[0][0] + offX, pts[0][1] + offY);
    strokeWithCloneStamp(pts);
}

// Bands centred on each mortar line, each with that line's perspective drop.
// A line at x + offX sits slope * offX lower than at x.
// pavDy: for the pavement, copy along its long joints (they run down-right),
// so the tile lines continue; null leaves the pavement alone.
function bands(x0, x1, offX, withSea, pavDy) {
    var drop = function (slope) { return Math.round(slope * offX * 10) / 10; };
    if (withSea) cloneBand(flat(394), shift(BACK, -3), x0, x1, offX, drop(-0.050));
    cloneBand(shift(BACK, -3), mid(TOP, L1), x0, x1, offX, drop(-0.057));
    cloneBand(mid(TOP, L1), mid(L1, L2), x0, x1, offX, drop(-0.103));
    cloneBand(mid(L1, L2), mid(L2, L3), x0, x1, offX, drop(-0.119));
    cloneBand(mid(L2, L3), mid(L3, BASE), x0, x1, offX, drop(-0.135));
    if (pavDy == null) {
        cloneBand(mid(L3, BASE), shift(BASE, -4), x0, x1, offX, drop(-0.143));
    } else {
        // keep the wall direction a little past the base so its contact
        // shadow on the pavement continues too
        cloneBand(mid(L3, BASE), shift(BASE, 14), x0, x1, offX, drop(-0.143));
        cloneBand(shift(BASE, 14), flat(838), x0, x1, offX, pavDy);
    }
}

function trimTo(x1, y1, x2, y2, feather) {
    doc.selection.select([[x1, y1], [x2, y1], [x2, y2], [x1, y2]]);
    doc.selection.feather(feather);
    doc.selection.invert();
    doc.selection.clear();
    doc.selection.deselect();
}

selectCloneStamp();
setBrush(BRUSH, 40);

// 1. Graffiti: left half from the clean stone to its left, right half from
// the clean stone to its right.
var graffiti = bg.duplicate();
graffiti.name = "Clone Stamp - graffiti";
doc.activeLayer = graffiti;
bands(497, 596, -100, false, null);
bands(596, 708, 115, false, null);
trimTo(474, 496, 722, 712, 4);

// 2. Litter bin: rebuild the wall leftwards in two steps of 117px, the
// second step cloning from the first, down into the pavement and shadow.
var stamp = new ActionDescriptor(); stamp.putBoolean(cID("Dplc"), true);
doc.activeLayer = graffiti;
executeAction(sID("mergeVisible"), stamp, DialogModes.NO); // Cmd+Opt+Shift+E
var bin = doc.activeLayer;
bin.name = "Clone Stamp - bin";
bands(272, 384, 117, true, 49);
bands(156, 272, 117, true, 53);
// Continue to the image edge so the bin's shadow on the wall goes too.
bands(39, 156, 117, true, 58);
bands(0, 39, 117, true, 61);
trimTo(-20, 388, 396, 842, 3);

doc.activeLayer = doc.layers[0];
var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
doc.saveAs(new File(dir + "/promenade-retouched.psd"), psd, true);
doc.saveAs(new File(dir + "/preview.png"), new PNGSaveOptions(), true);
var names = [];
for (var i = 0; i < doc.layers.length; i++) names.push(doc.layers[i].name);
doc.close(SaveOptions.DONOTSAVECHANGES);
names.join(" | ");
