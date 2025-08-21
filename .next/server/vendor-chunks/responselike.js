"use strict";
/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
exports.id = "vendor-chunks/responselike";
exports.ids = ["vendor-chunks/responselike"];
exports.modules = {

/***/ "(rsc)/./node_modules/responselike/index.js":
/*!********************************************!*\
  !*** ./node_modules/responselike/index.js ***!
  \********************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

eval("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   \"default\": () => (/* binding */ Response)\n/* harmony export */ });\n/* harmony import */ var node_stream__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:stream */ \"node:stream\");\n/* harmony import */ var lowercase_keys__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! lowercase-keys */ \"(rsc)/./node_modules/lowercase-keys/index.js\");\n\n\n\nclass Response extends node_stream__WEBPACK_IMPORTED_MODULE_0__.Readable {\n\tstatusCode;\n\theaders;\n\tbody;\n\turl;\n\n\tconstructor({statusCode, headers, body, url}) {\n\t\tif (typeof statusCode !== 'number') {\n\t\t\tthrow new TypeError('Argument `statusCode` should be a number');\n\t\t}\n\n\t\tif (typeof headers !== 'object') {\n\t\t\tthrow new TypeError('Argument `headers` should be an object');\n\t\t}\n\n\t\tif (!(body instanceof Uint8Array)) {\n\t\t\tthrow new TypeError('Argument `body` should be a buffer');\n\t\t}\n\n\t\tif (typeof url !== 'string') {\n\t\t\tthrow new TypeError('Argument `url` should be a string');\n\t\t}\n\n\t\tsuper({\n\t\t\tread() {\n\t\t\t\tthis.push(body);\n\t\t\t\tthis.push(null);\n\t\t\t},\n\t\t});\n\n\t\tthis.statusCode = statusCode;\n\t\tthis.headers = (0,lowercase_keys__WEBPACK_IMPORTED_MODULE_1__[\"default\"])(headers);\n\t\tthis.body = body;\n\t\tthis.url = url;\n\t}\n}\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKHJzYykvLi9ub2RlX21vZHVsZXMvcmVzcG9uc2VsaWtlL2luZGV4LmpzIiwibWFwcGluZ3MiOiI7Ozs7OztBQUF1RDtBQUNaOztBQUU1Qix1QkFBdUIsaURBQWM7QUFDcEQ7QUFDQTtBQUNBO0FBQ0E7O0FBRUEsY0FBYywrQkFBK0I7QUFDN0M7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsSUFBSTtBQUNKLEdBQUc7O0FBRUg7QUFDQSxpQkFBaUIsMERBQWE7QUFDOUI7QUFDQTtBQUNBO0FBQ0EiLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly9kbmZtLWJvdC8uL25vZGVfbW9kdWxlcy9yZXNwb25zZWxpa2UvaW5kZXguanM/NTUzOSJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1JlYWRhYmxlIGFzIFJlYWRhYmxlU3RyZWFtfSBmcm9tICdub2RlOnN0cmVhbSc7XG5pbXBvcnQgbG93ZXJjYXNlS2V5cyBmcm9tICdsb3dlcmNhc2Uta2V5cyc7XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIFJlc3BvbnNlIGV4dGVuZHMgUmVhZGFibGVTdHJlYW0ge1xuXHRzdGF0dXNDb2RlO1xuXHRoZWFkZXJzO1xuXHRib2R5O1xuXHR1cmw7XG5cblx0Y29uc3RydWN0b3Ioe3N0YXR1c0NvZGUsIGhlYWRlcnMsIGJvZHksIHVybH0pIHtcblx0XHRpZiAodHlwZW9mIHN0YXR1c0NvZGUgIT09ICdudW1iZXInKSB7XG5cdFx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdBcmd1bWVudCBgc3RhdHVzQ29kZWAgc2hvdWxkIGJlIGEgbnVtYmVyJyk7XG5cdFx0fVxuXG5cdFx0aWYgKHR5cGVvZiBoZWFkZXJzICE9PSAnb2JqZWN0Jykge1xuXHRcdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignQXJndW1lbnQgYGhlYWRlcnNgIHNob3VsZCBiZSBhbiBvYmplY3QnKTtcblx0XHR9XG5cblx0XHRpZiAoIShib2R5IGluc3RhbmNlb2YgVWludDhBcnJheSkpIHtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IGBib2R5YCBzaG91bGQgYmUgYSBidWZmZXInKTtcblx0XHR9XG5cblx0XHRpZiAodHlwZW9mIHVybCAhPT0gJ3N0cmluZycpIHtcblx0XHRcdHRocm93IG5ldyBUeXBlRXJyb3IoJ0FyZ3VtZW50IGB1cmxgIHNob3VsZCBiZSBhIHN0cmluZycpO1xuXHRcdH1cblxuXHRcdHN1cGVyKHtcblx0XHRcdHJlYWQoKSB7XG5cdFx0XHRcdHRoaXMucHVzaChib2R5KTtcblx0XHRcdFx0dGhpcy5wdXNoKG51bGwpO1xuXHRcdFx0fSxcblx0XHR9KTtcblxuXHRcdHRoaXMuc3RhdHVzQ29kZSA9IHN0YXR1c0NvZGU7XG5cdFx0dGhpcy5oZWFkZXJzID0gbG93ZXJjYXNlS2V5cyhoZWFkZXJzKTtcblx0XHR0aGlzLmJvZHkgPSBib2R5O1xuXHRcdHRoaXMudXJsID0gdXJsO1xuXHR9XG59XG4iXSwibmFtZXMiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(rsc)/./node_modules/responselike/index.js\n");

/***/ })

};
;