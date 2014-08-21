/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright (c) 2014 Adobe Systems Incorporated. All rights reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, bitwise: true */
/*global define: true, require: true */

/* Help construct the svgOM from generator data */

(function () {
"use strict";

    var omgUtils = require("./svgOMGeneratorUtils.js");
    
    var CONST_COLOR_BLACK = { "red": 0, "green": 0, "blue": 0 };
    
	function SVGOMGeneratorStyles() {
        var decamelcase = function (string) {
            return string.replace(/([A-Z])/g, "-$1");
        }

        var fetchOpacity = function (layer) {
            if (layer.blendOptions &&
                layer.blendOptions.opacity) {
                return layer.blendOptions.opacity.value / 100;
            }
            return undefined;
        }

        this.fetchBlendMode = function (layer) {
            var blendMode;
            if (layer.blendOptions &&
                layer.blendOptions.mode) {
                blendMode = layer.blendOptions.mode;
                blendMode = decamelcase(blendMode);
            }

            switch (blendMode) {
                case "pass-Through":
                case "normal":
                    return undefined;
                case "multiply":
                case "screen":
                case "overlay":
                case "darken":
                case "lighten":
                case "color-dodge":
                case "color-burn":
                case "hard-light":
                case "soft-light":
                case "difference":
                case "exclusion":
                case "hue":
                case "saturation":
                case "color":
                case "luminosity":
                    return blendMode;
                default:
                    return undefined;
            }
        }

        this.addGlobalStyle = function (svgNode, layer) {

            var propertyFetchers = { // Properties we fetch for all layers
                    "opacity": fetchOpacity,
                    "mix-blend-mode": this.fetchBlendMode
                },
                property;

            for (property in propertyFetchers) {
                var value = propertyFetchers[property](layer);
                if (value !== undefined) {
                    svgNode.style[property] = value;
                }
            }
        };
        
        this.addStroke = function (svgNode, layer) {
            var stroke = svgNode.style.stroke || {},
                strokeStyle = layer.strokeStyle,
                toStrokeLinecap = {
                    "strokeStyleRoundCap": "round",
                    "strokeStyleButtCap": "butt",
                    "strokeStyleSquareCap": "square"
                },
                toStrokeLinejoin = {
                    "strokeStyleBevelJoin": "bevel",
                    "strokeStyleRoundJoin": "round",
                    "strokeStyleMiterJoin": "miter"
                };
            
            svgNode.style.stroke = stroke;
            
            if (strokeStyle) {
                stroke.strokeEnabled = !!strokeStyle.strokeEnabled;
                stroke.lineCap = strokeStyle.strokeStyleLineCapType ? toStrokeLinecap[strokeStyle.strokeStyleLineCapType] : "butt";
                stroke.lineJoin = strokeStyle.strokeStyleLineJoinType ? toStrokeLinejoin[strokeStyle.strokeStyleLineJoinType] : "miter";
                stroke.lineWidth = strokeStyle.strokeStyleLineWidth ? strokeStyle.strokeStyleLineWidth.value : 1;
                stroke.miterLimit = strokeStyle.strokeStyleMiterLimit ? strokeStyle.strokeStyleMiterLimit : 100;
                stroke.dashArray = strokeStyle.strokeStyleLineDashSet ? strokeStyle.strokeStyleLineDashSet : [];
                stroke.dashOffset = strokeStyle.strokeStyleLineDashOffset ? strokeStyle.strokeStyleLineDashOffset.value : "0";
                stroke.color = (strokeStyle.strokeStyleContent && strokeStyle.strokeStyleContent.color) ? omgUtils.toColor(strokeStyle.strokeStyleContent.color) : CONST_COLOR_BLACK;
                stroke.opacity = strokeStyle.strokeStyleOpacity ? strokeStyle.strokeStyleOpacity.value / 100 : 0;
                if (strokeStyle.strokeStyleContent && strokeStyle.strokeStyleContent.gradient) {
                    stroke.gradient = omgUtils.toGradient(strokeStyle.strokeStyleContent);
                }
            } else {
                stroke.strokeEnabled = false;
            }
        };
        
        this.addFill = function (svgNode, layer) {
            var fill = svgNode.style.fill || {},
                fillStyle = layer.fill,
                strokeStyle = layer.strokeStyle;
            if (!fillStyle || strokeStyle && strokeStyle.fillEnabled === false) {
                return;
            }

            var fillClass = fillStyle["class"];
            
            svgNode.style.fill = fill;
            
            if (fillClass === "solidColorLayer") {
                fill.style = "solid";
                fill.color = omgUtils.toColor(fillStyle.color);
            } else if (fillClass == "gradientLayer") {
                fill.style = "gradient";
                fill.gradientType = fillStyle.type;
                
                if (fill.style === "gradient") {
                    fill.gradient = omgUtils.toGradient(fillStyle);
                } else {
                    console.log("WARNING: Unhandled gradient type = " + JSON.stringify(fill));
                }
            } else {
                //unhandled fill
                console.log("WARNING: Unhandled fill " + fillClass);
            }
        };

        this.addFx = function (svgNode, layer) {
            var color;

            if (!layer.layerEffects) {
                return;
            }
            svgNode.style.fx = JSON.parse(JSON.stringify(layer.layerEffects));

            // Alpha isn't really used in an solid fill since there is a separate opacity passed.
            if (svgNode.style.fx.solidFill) {
                color = svgNode.style.fx.solidFill.color;
                color.r = color.red;
                color.g = color.green;
                color.b = color.blue;
                color.a = 1;
            }

            if (svgNode.style.fx.outerGlow) {
                if (svgNode.style.fx.outerGlow.gradient) {
                    var gradient = omgUtils.toColorStops(svgNode.style.fx.outerGlow);
                    svgNode.style.fx.outerGlow.gradient = gradient;
                } else {
                    color = svgNode.style.fx.outerGlow.color;
                    svgNode.style.fx.outerGlow.color = omgUtils.toColor(color);
                }
            }

            if (svgNode.style.fx.innerGlow) {
                if (svgNode.style.fx.innerGlow.gradient) {
                    var gradient = omgUtils.toColorStops(svgNode.style.fx.innerGlow);
                    // Reverse gradient.
                    for (var i = gradient.stops.length - 1; i >= 0; i--) {
                        gradient.stops[i].position = Math.abs(gradient.stops[i].position - 100);
                    }
                    gradient.stops.sort(function (a, b) {
                        return a.position - b.position;
                    });
                    svgNode.style.fx.innerGlow.gradient = gradient;
                } else {
                    color = svgNode.style.fx.innerGlow.color;
                    svgNode.style.fx.innerGlow.color = omgUtils.toColor(color);
                }
            }

            if (svgNode.style.fx.chromeFX) {
                color = svgNode.style.fx.chromeFX.color;
                svgNode.style.fx.chromeFX.color = omgUtils.toColor(color);
            }

            if (svgNode.style.fx.innerShadow) {
                color = svgNode.style.fx.innerShadow.color;
                svgNode.style.fx.innerShadow.color = omgUtils.toColor(color);
            }

            if (svgNode.style.fx.gradientFill) {
                var gradient = omgUtils.toGradient(svgNode.style.fx.gradientFill);
                svgNode.style.fx.gradientFill.gradient = gradient;
            }

            if (svgNode.style.fx.dropShadow) {
                color = svgNode.style.fx.dropShadow.color;
                svgNode.style.fx.dropShadow.color = omgUtils.toColor(color);
            }
        };
        
        this.addStylingData = function (svgNode, layer) {

            this.addGlobalStyle(svgNode, layer);

            // FIXME: The PS imported image already has all fx effects applied.
            if (svgNode.type == "generic") {
                return;
            }

            this.addStroke(svgNode, layer);
            this.addFill(svgNode, layer);
            this.addFx(svgNode, layer);
            
            //more stuff...
        };

        this.addTextChunkStyle = function (span, textStyle) {
            if (textStyle.textStyle.color) {
                span.style["fill"] = {
                    style: "solid",
                    color: omgUtils.toColor(textStyle.textStyle.color)
                };
            }

            if (textStyle.textStyle.fontName) {
                span.style["font-family"] = "\"" + textStyle.textStyle.fontName + "\"";
            }

            if (textStyle.textStyle.size) {
                span.style["font-size"] = textStyle.textStyle.size; // Need to take units into account.
            }

            if (textStyle.textStyle.fontStyleName) {
                if (textStyle.textStyle.fontStyleName.indexOf("Bold") >= 0) {
                    span.style["font-weight"] = "bold";
                }
                if (textStyle.textStyle.fontStyleName.indexOf("Italic") >= 0) {
                    span.style["font-style"] = "italic";
                }
            }

            if (textStyle.textStyle.strikethrough && textStyle.textStyle.strikethrough.indexOf("StrikethroughOn") >= 0) {
                span.style["text-decoration"] = "line-through";                
            }

            if (textStyle.textStyle.underline && textStyle.textStyle.underline.indexOf("underlineOn") >= 0) {
                if (span.style["text-decoration"]) {
                    span.style["text-decoration"] += " underline";
                } else {
                    span.style["text-decoration"] = "underline";                    
                }             
            }

            if (textStyle.textStyle.fontCaps) {
                if (textStyle.textStyle.fontCaps === "smallCaps") {
                    span.style["font-variant"] = "small-caps";
                } else if (textStyle.textStyle.fontCaps === "allCaps") {
                    span.style["text-transform"] = "uppercase";                    
                }         
            }

            if (textStyle.textStyle.baseline) {
                if (textStyle.textStyle.baseline === "smallCaps") {
                    span.style["baseline-shift"] = "super";
                } else if (textStyle.textStyle.baseline === "allCaps") {
                    span.style["baseline-shift"] = "sub";                    
                }         
            }
        }

        this.addParagraphStyle = function (paragraphNode, paragraphStyle) {
            function fetchTextAlign(paragraphStyle) {
                var alignment = {
                        "left": undefined,
                        "center": "middle",
                        "right": "end"
                    };

                if (paragraphStyle.align) {
                    return alignment[paragraphStyle.align];
                }
                return undefined;
            }

            function computeMaxFontSize(paragraphNode) {
                var maxSize = { value: 0, units: "pointsUnit" },
                    i = 0;

                // For correct paragraph offset, we need to know the maximal
                // font size.
                if (!paragraphNode.children.length) {
                    return undefined;
                }
                for (i = 0; i < paragraphNode.children.length; ++i) {
                    if (!paragraphNode.children[i].style &&
                        !paragraphNode.children[i].style["font-size"]) {
                        continue;
                    }
                    // FIXME: Support for real unit computation missing. Probably needs to move to writer.
                    // Since fonts always use pt in Adobe products, it most likely doesn't cause issues.
                    maxSize.value = Math.max(maxSize.value, paragraphNode.children[i].style["font-size"].value); 
                }
                return maxSize;
            }

            paragraphNode.style = {
                "text-anchor": fetchTextAlign(paragraphStyle),
                "font-size": computeMaxFontSize(paragraphNode)
            }
        }

        this.addTextStyle = function (svgNode, layer) {
            if (layer.text.textShape[0].orientation &&
                layer.text.textShape[0].orientation == "vertical") {
                svgNode.style["writing-mode"] = "tb";
                svgNode.style["glyph-orientation-vertical"] = "0";
            }
        }
	}

	module.exports = new SVGOMGeneratorStyles();

}());
     
    