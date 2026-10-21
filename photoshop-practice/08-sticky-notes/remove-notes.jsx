// Removes the sticky notes from the wall the Magic Eraser way.
//  1. "Clean wall": a copy of the photo with each note and its shadow
//     rebuilt from the surrounding wall (Content-Aware Fill).
//  2. "Photo (notes erased)": the photo on top. Each note is removed with a
//     Magic Eraser click (tolerance 32, contiguous, anti-aliased), done as
//     the identical Magic Wand selection + Delete, since scripts can't click.
//     A second click in each note's shadow removes the shadow; it is limited
//     to the shadow's area, and the clean wall shows through underneath.
//     A last full-tolerance click per note, limited to its area, takes the
//     soft outline and the curled edge.
#target photoshop
app.displayDialogs = DialogModes.NO;
app.preferences.rulerUnits = Units.PIXELS;

var dir = "/Users/sowmi-zstch1630/Pictures/ps-notes";
function cID(s) { return charIDToTypeID(s); }
function sID(s) { return stringIDToTypeID(s); }
function rect(x1, y1, x2, y2) { return [[x1, y1], [x2, y1], [x2, y2], [x1, y2]]; }

// [left, top, right, bottom, centreX, centreY] of each note, measured on the photo
var NOTES = [
    [460, 97, 589, 231, 524, 163],
    [94, 134, 233, 277, 163, 205],
    [305, 300, 437, 436, 370, 368],
    [592, 304, 726, 441, 658, 373],
    [51, 375, 188, 517, 119, 446],
    [473, 521, 607, 662, 540, 591],
    [194, 589, 324, 726, 258, 657]
];
// note + its shadow (6-8px on the left, more at the lower corner, ~35px below)
function shadowBox(n) { return rect(n[0] - 34, n[1] - 4, n[2] + 6, n[3] + 44); }

var doc = app.open(new File(dir + "/source.png"));
var bg = doc.layers[doc.layers.length - 1];

function contentAwareFill() {
    var d = new ActionDescriptor();
    d.putEnumerated(cID("Usng"), cID("FlCn"), sID("contentAware"));
    d.putBoolean(sID("contentAwareColorAdaptationFill"), true);
    d.putUnitDouble(cID("Opct"), cID("#Prc"), 100);
    d.putEnumerated(cID("Md  "), cID("BlnM"), cID("Nrml"));
    executeAction(cID("Fl  "), d, DialogModes.NO);
}

// One Magic Eraser click = Magic Wand at (x, y) with these settings + Delete.
function magicEraserClick(x, y, tolerance, limitTo, contiguous) {
    var r = new ActionReference(); r.putProperty(cID("Chnl"), cID("fsel"));
    var d = new ActionDescriptor(); d.putReference(cID("null"), r);
    var p = new ActionDescriptor();
    p.putUnitDouble(cID("Hrzn"), cID("#Pxl"), x);
    p.putUnitDouble(cID("Vrtc"), cID("#Pxl"), y);
    d.putObject(cID("T   "), cID("Pnt "), p);
    d.putInteger(cID("Tlrn"), tolerance);
    d.putBoolean(cID("AntA"), true);
    d.putBoolean(cID("Cntg"), contiguous !== false);
    d.putBoolean(sID("merged"), false); // sample this layer only
    executeAction(cID("setd"), d, DialogModes.NO);
    if (limitTo) doc.selection.select(limitTo, SelectionType.INTERSECT);
    doc.selection.clear();
    doc.selection.deselect();
}

// ---- 1. clean wall -----------------------------------------------------------
var plate = bg.duplicate();
plate.name = "Clean wall";
doc.activeLayer = plate;
for (var i = 0; i < NOTES.length; i++) {
    doc.selection.select(shadowBox(NOTES[i]), i ? SelectionType.EXTEND : SelectionType.REPLACE);
}
doc.selection.expand(4);
contentAwareFill();
doc.selection.deselect();

// ---- 2. photo on top, notes erased -------------------------------------------
var photo = bg.duplicate();
photo.move(plate, ElementPlacement.PLACEBEFORE);
photo.name = "Photo (notes erased)";
doc.activeLayer = photo;
for (var i = 0; i < NOTES.length; i++) {
    var n = NOTES[i];
    magicEraserClick(n[4], n[5], 32);                                  // the note
    magicEraserClick(n[4], n[3] + 12, 60, rect(n[0] - 12, n[3] - 6, n[2] + 6, n[3] + 40)); // shadow below
    magicEraserClick(n[0] - 5, n[5], 60, rect(n[0] - 12, n[1] - 4, n[0] + 6, n[3] + 40));  // shadow left
    // Clean-up click at full tolerance with Contiguous off, limited to this
    // note's area: takes the soft yellow outline, the darker curled edge (an
    // island once the note is gone) and what's left of the shadow.
    magicEraserClick(n[2] + 3, n[5], 255, shadowBox(n), false);
}

var psd = new PhotoshopSaveOptions(); psd.layers = true; psd.embedColorProfile = true;
doc.saveAs(new File(dir + "/notes-removed.psd"), psd, true);
doc.saveAs(new File(dir + "/preview.png"), new PNGSaveOptions(), true);
var names = [];
for (var i = 0; i < doc.layers.length; i++) names.push(doc.layers[i].name);
doc.close(SaveOptions.DONOTSAVECHANGES);
names.join(" | ");
