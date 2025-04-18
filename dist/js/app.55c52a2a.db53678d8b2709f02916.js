(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([["app.55c52a2a"],{"0829":function(e,t,n){"use strict";(function(e,r){n.d(t,"a",(function(){return P})),n.d(t,"b",(function(){return Ol})),n.d(t,"c",(function(){return _c})),n.d(t,"d",(function(){return Vl})),n.d(t,"e",(function(){return Sc})),n.d(t,"f",(function(){return kl})),n.d(t,"g",(function(){return Al})),n.d(t,"h",(function(){return Nc})),n.d(t,"i",(function(){return kc})),n.d(t,"j",(function(){return wl})),n.d(t,"k",(function(){return Fl})),n.d(t,"l",(function(){return pl})),n.d(t,"m",(function(){return ql})),n.d(t,"n",(function(){return Kl})),n.d(t,"o",(function(){return hl})),n.d(t,"p",(function(){return Ql})),n.d(t,"q",(function(){return Ml})),n.d(t,"r",(function(){return Rl})),n.d(t,"s",(function(){return fl})),n.d(t,"t",(function(){return Hl}));var s=n("589b"),i=n("22e5"),o=n("e691"),a=n("1fd5"),u=n("b516"),c=n("b4ad");const l="@firebase/firestore";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class h{constructor(e){this.uid=e}isAuthenticated(){return null!=this.uid}toKey(){return this.isAuthenticated()?"uid:"+this.uid:"anonymous-user"}isEqual(e){return e.uid===this.uid}}h.UNAUTHENTICATED=new h(null),h.GOOGLE_CREDENTIALS=new h("google-credentials-uid"),h.FIRST_PARTY=new h("first-party-uid"),h.MOCK_USER=new h("mock-user");
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let d="10.12.3";
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const f=new o["b"]("@firebase/firestore");function m(){return f.logLevel}function g(e,...t){if(f.logLevel<=o["a"].DEBUG){const n=t.map(w);f.debug(`Firestore (${d}): ${e}`,...n)}}function p(e,...t){if(f.logLevel<=o["a"].ERROR){const n=t.map(w);f.error(`Firestore (${d}): ${e}`,...n)}}function y(e,...t){if(f.logLevel<=o["a"].WARN){const n=t.map(w);f.warn(`Firestore (${d}): ${e}`,...n)}}function w(e){if("string"==typeof e)return e;try{
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
return function(e){return JSON.stringify(e)}(e)}catch(t){return e}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function v(e="Unexpected state"){const t=`FIRESTORE (${d}) INTERNAL ASSERTION FAILED: `+e;throw p(t),new Error(t)}function I(e,t){e||v()}function b(e,t){return e}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const E={OK:"ok",CANCELLED:"cancelled",UNKNOWN:"unknown",INVALID_ARGUMENT:"invalid-argument",DEADLINE_EXCEEDED:"deadline-exceeded",NOT_FOUND:"not-found",ALREADY_EXISTS:"already-exists",PERMISSION_DENIED:"permission-denied",UNAUTHENTICATED:"unauthenticated",RESOURCE_EXHAUSTED:"resource-exhausted",FAILED_PRECONDITION:"failed-precondition",ABORTED:"aborted",OUT_OF_RANGE:"out-of-range",UNIMPLEMENTED:"unimplemented",INTERNAL:"internal",UNAVAILABLE:"unavailable",DATA_LOSS:"data-loss"};class T extends a["c"]{constructor(e,t){super(e,t),this.code=e,this.message=t,this.toString=()=>`${this.name}: [code=${this.code}]: ${this.message}`}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class _{constructor(){this.promise=new Promise((e,t)=>{this.resolve=e,this.reject=t})}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class S{constructor(e,t){this.user=t,this.type="OAuth",this.headers=new Map,this.headers.set("Authorization","Bearer "+e)}}class x{getToken(){return Promise.resolve(null)}invalidateToken(){}start(e,t){e.enqueueRetryable(()=>t(h.UNAUTHENTICATED))}shutdown(){}}class C{constructor(e){this.token=e,this.changeListener=null}getToken(){return Promise.resolve(this.token)}invalidateToken(){}start(e,t){this.changeListener=t,e.enqueueRetryable(()=>t(this.token.user))}shutdown(){this.changeListener=null}}class D{constructor(e){this.t=e,this.currentUser=h.UNAUTHENTICATED,this.i=0,this.forceRefresh=!1,this.auth=null}start(e,t){let n=this.i;const r=e=>this.i!==n?(n=this.i,t(e)):Promise.resolve();let s=new _;this.o=()=>{this.i++,this.currentUser=this.u(),s.resolve(),s=new _,e.enqueueRetryable(()=>r(this.currentUser))};const i=()=>{const t=s;e.enqueueRetryable(async()=>{await t.promise,await r(this.currentUser)})},o=e=>{g("FirebaseAuthCredentialsProvider","Auth detected"),this.auth=e,this.auth.addAuthTokenListener(this.o),i()};this.t.onInit(e=>o(e)),setTimeout(()=>{if(!this.auth){const e=this.t.getImmediate({optional:!0});e?o(e):(g("FirebaseAuthCredentialsProvider","Auth not yet detected"),s.resolve(),s=new _)}},0),i()}getToken(){const e=this.i,t=this.forceRefresh;return this.forceRefresh=!1,this.auth?this.auth.getToken(t).then(t=>this.i!==e?(g("FirebaseAuthCredentialsProvider","getToken aborted due to token change."),this.getToken()):t?(I("string"==typeof t.accessToken),new S(t.accessToken,this.currentUser)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.auth&&this.auth.removeAuthTokenListener(this.o)}u(){const e=this.auth&&this.auth.getUid();return I(null===e||"string"==typeof e),new h(e)}}class k{constructor(e,t,n){this.l=e,this.h=t,this.P=n,this.type="FirstParty",this.user=h.FIRST_PARTY,this.I=new Map}T(){return this.P?this.P():null}get headers(){this.I.set("X-Goog-AuthUser",this.l);const e=this.T();return e&&this.I.set("Authorization",e),this.h&&this.I.set("X-Goog-Iam-Authorization-Token",this.h),this.I}}class N{constructor(e,t,n){this.l=e,this.h=t,this.P=n}getToken(){return Promise.resolve(new k(this.l,this.h,this.P))}start(e,t){e.enqueueRetryable(()=>t(h.FIRST_PARTY))}shutdown(){}invalidateToken(){}}class A{constructor(e){this.value=e,this.type="AppCheck",this.headers=new Map,e&&e.length>0&&this.headers.set("x-firebase-appcheck",this.value)}}class M{constructor(e){this.A=e,this.forceRefresh=!1,this.appCheck=null,this.R=null}start(e,t){const n=e=>{null!=e.error&&g("FirebaseAppCheckTokenProvider","Error getting App Check token; using placeholder token instead. Error: "+e.error.message);const n=e.token!==this.R;return this.R=e.token,g("FirebaseAppCheckTokenProvider",`Received ${n?"new":"existing"} token.`),n?t(e.token):Promise.resolve()};this.o=t=>{e.enqueueRetryable(()=>n(t))};const r=e=>{g("FirebaseAppCheckTokenProvider","AppCheck detected"),this.appCheck=e,this.appCheck.addTokenListener(this.o)};this.A.onInit(e=>r(e)),setTimeout(()=>{if(!this.appCheck){const e=this.A.getImmediate({optional:!0});e?r(e):g("FirebaseAppCheckTokenProvider","AppCheck not yet detected")}},0)}getToken(){const e=this.forceRefresh;return this.forceRefresh=!1,this.appCheck?this.appCheck.getToken(e).then(e=>e?(I("string"==typeof e.token),this.R=e.token,new A(e.token)):null):Promise.resolve(null)}invalidateToken(){this.forceRefresh=!0}shutdown(){this.appCheck&&this.appCheck.removeTokenListener(this.o)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function R(e){const t="undefined"!=typeof self&&(self.crypto||self.msCrypto),n=new Uint8Array(e);if(t&&"function"==typeof t.getRandomValues)t.getRandomValues(n);else for(let r=0;r<e;r++)n[r]=Math.floor(256*Math.random());return n}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class V{static newId(){const e="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",t=Math.floor(256/e.length)*e.length;let n="";for(;n.length<20;){const r=R(40);for(let s=0;s<r.length;++s)n.length<20&&r[s]<t&&(n+=e.charAt(r[s]%e.length))}return n}}function O(e,t){return e<t?-1:e>t?1:0}function F(e,t,n){return e.length===t.length&&e.every((e,r)=>n(e,t[r]))}function L(e){return e+"\0"}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class P{constructor(e,t){if(this.seconds=e,this.nanoseconds=t,t<0)throw new T(E.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(t>=1e9)throw new T(E.INVALID_ARGUMENT,"Timestamp nanoseconds out of range: "+t);if(e<-62135596800)throw new T(E.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e);if(e>=253402300800)throw new T(E.INVALID_ARGUMENT,"Timestamp seconds out of range: "+e)}static now(){return P.fromMillis(Date.now())}static fromDate(e){return P.fromMillis(e.getTime())}static fromMillis(e){const t=Math.floor(e/1e3),n=Math.floor(1e6*(e-1e3*t));return new P(t,n)}toDate(){return new Date(this.toMillis())}toMillis(){return 1e3*this.seconds+this.nanoseconds/1e6}_compareTo(e){return this.seconds===e.seconds?O(this.nanoseconds,e.nanoseconds):O(this.seconds,e.seconds)}isEqual(e){return e.seconds===this.seconds&&e.nanoseconds===this.nanoseconds}toString(){return"Timestamp(seconds="+this.seconds+", nanoseconds="+this.nanoseconds+")"}toJSON(){return{seconds:this.seconds,nanoseconds:this.nanoseconds}}valueOf(){const e=this.seconds- -62135596800;return String(e).padStart(12,"0")+"."+String(this.nanoseconds).padStart(9,"0")}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class U{constructor(e){this.timestamp=e}static fromTimestamp(e){return new U(e)}static min(){return new U(new P(0,0))}static max(){return new U(new P(253402300799,999999999))}compareTo(e){return this.timestamp._compareTo(e.timestamp)}isEqual(e){return this.timestamp.isEqual(e.timestamp)}toMicroseconds(){return 1e6*this.timestamp.seconds+this.timestamp.nanoseconds/1e3}toString(){return"SnapshotVersion("+this.timestamp.toString()+")"}toTimestamp(){return this.timestamp}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class q{constructor(e,t,n){void 0===t?t=0:t>e.length&&v(),void 0===n?n=e.length-t:n>e.length-t&&v(),this.segments=e,this.offset=t,this.len=n}get length(){return this.len}isEqual(e){return 0===q.comparator(this,e)}child(e){const t=this.segments.slice(this.offset,this.limit());return e instanceof q?e.forEach(e=>{t.push(e)}):t.push(e),this.construct(t)}limit(){return this.offset+this.length}popFirst(e){return e=void 0===e?1:e,this.construct(this.segments,this.offset+e,this.length-e)}popLast(){return this.construct(this.segments,this.offset,this.length-1)}firstSegment(){return this.segments[this.offset]}lastSegment(){return this.get(this.length-1)}get(e){return this.segments[this.offset+e]}isEmpty(){return 0===this.length}isPrefixOf(e){if(e.length<this.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}isImmediateParentOf(e){if(this.length+1!==e.length)return!1;for(let t=0;t<this.length;t++)if(this.get(t)!==e.get(t))return!1;return!0}forEach(e){for(let t=this.offset,n=this.limit();t<n;t++)e(this.segments[t])}toArray(){return this.segments.slice(this.offset,this.limit())}static comparator(e,t){const n=Math.min(e.length,t.length);for(let r=0;r<n;r++){const n=e.get(r),s=t.get(r);if(n<s)return-1;if(n>s)return 1}return e.length<t.length?-1:e.length>t.length?1:0}}class B extends q{construct(e,t,n){return new B(e,t,n)}canonicalString(){return this.toArray().join("/")}toString(){return this.canonicalString()}toUriEncodedString(){return this.toArray().map(encodeURIComponent).join("/")}static fromString(...e){const t=[];for(const n of e){if(n.indexOf("//")>=0)throw new T(E.INVALID_ARGUMENT,`Invalid segment (${n}). Paths must not contain // in them.`);t.push(...n.split("/").filter(e=>e.length>0))}return new B(t)}static emptyPath(){return new B([])}}const z=/^[_a-zA-Z][_a-zA-Z0-9]*$/;class G extends q{construct(e,t,n){return new G(e,t,n)}static isValidIdentifier(e){return z.test(e)}canonicalString(){return this.toArray().map(e=>(e=e.replace(/\\/g,"\\\\").replace(/`/g,"\\`"),G.isValidIdentifier(e)||(e="`"+e+"`"),e)).join(".")}toString(){return this.canonicalString()}isKeyField(){return 1===this.length&&"__name__"===this.get(0)}static keyField(){return new G(["__name__"])}static fromServerFormat(e){const t=[];let n="",r=0;const s=()=>{if(0===n.length)throw new T(E.INVALID_ARGUMENT,`Invalid field path (${e}). Paths must not be empty, begin with '.', end with '.', or contain '..'`);t.push(n),n=""};let i=!1;for(;r<e.length;){const t=e[r];if("\\"===t){if(r+1===e.length)throw new T(E.INVALID_ARGUMENT,"Path has trailing escape character: "+e);const t=e[r+1];if("\\"!==t&&"."!==t&&"`"!==t)throw new T(E.INVALID_ARGUMENT,"Path has invalid escape sequence: "+e);n+=t,r+=2}else"`"===t?(i=!i,r++):"."!==t||i?(n+=t,r++):(s(),r++)}if(s(),i)throw new T(E.INVALID_ARGUMENT,"Unterminated ` in path: "+e);return new G(t)}static emptyPath(){return new G([])}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class K{constructor(e){this.path=e}static fromPath(e){return new K(B.fromString(e))}static fromName(e){return new K(B.fromString(e).popFirst(5))}static empty(){return new K(B.emptyPath())}get collectionGroup(){return this.path.popLast().lastSegment()}hasCollectionId(e){return this.path.length>=2&&this.path.get(this.path.length-2)===e}getCollectionGroup(){return this.path.get(this.path.length-2)}getCollectionPath(){return this.path.popLast()}isEqual(e){return null!==e&&0===B.comparator(this.path,e.path)}toString(){return this.path.toString()}static comparator(e,t){return B.comparator(e.path,t.path)}static isDocumentKey(e){return e.length%2==0}static fromSegments(e){return new K(new B(e.slice()))}}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class j{constructor(e,t,n,r){this.indexId=e,this.collectionGroup=t,this.fields=n,this.indexState=r}}function $(e){return e.fields.find(e=>2===e.kind)}function Q(e){return e.fields.filter(e=>2!==e.kind)}j.UNKNOWN_ID=-1;class H{constructor(e,t){this.fieldPath=e,this.kind=t}}class W{constructor(e,t){this.sequenceNumber=e,this.offset=t}static empty(){return new W(0,X.min())}}function J(e,t){const n=e.toTimestamp().seconds,r=e.toTimestamp().nanoseconds+1,s=U.fromTimestamp(1e9===r?new P(n+1,0):new P(n,r));return new X(s,K.empty(),t)}function Y(e){return new X(e.readTime,e.key,-1)}class X{constructor(e,t,n){this.readTime=e,this.documentKey=t,this.largestBatchId=n}static min(){return new X(U.min(),K.empty(),-1)}static max(){return new X(U.max(),K.empty(),-1)}}function Z(e,t){let n=e.readTime.compareTo(t.readTime);return 0!==n?n:(n=K.comparator(e.documentKey,t.documentKey),0!==n?n:O(e.largestBatchId,t.largestBatchId))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const ee="The current tab is not in the required state to perform this operation. It might be necessary to refresh the browser tab.";class te{constructor(){this.onCommittedListeners=[]}addOnCommittedListener(e){this.onCommittedListeners.push(e)}raiseOnCommittedEvent(){this.onCommittedListeners.forEach(e=>e())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */async function ne(e){if(e.code!==E.FAILED_PRECONDITION||e.message!==ee)throw e;g("LocalStore","Unexpectedly lost primary lease")}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class re{constructor(e){this.nextCallback=null,this.catchCallback=null,this.result=void 0,this.error=void 0,this.isDone=!1,this.callbackAttached=!1,e(e=>{this.isDone=!0,this.result=e,this.nextCallback&&this.nextCallback(e)},e=>{this.isDone=!0,this.error=e,this.catchCallback&&this.catchCallback(e)})}catch(e){return this.next(void 0,e)}next(e,t){return this.callbackAttached&&v(),this.callbackAttached=!0,this.isDone?this.error?this.wrapFailure(t,this.error):this.wrapSuccess(e,this.result):new re((n,r)=>{this.nextCallback=t=>{this.wrapSuccess(e,t).next(n,r)},this.catchCallback=e=>{this.wrapFailure(t,e).next(n,r)}})}toPromise(){return new Promise((e,t)=>{this.next(e,t)})}wrapUserFunction(e){try{const t=e();return t instanceof re?t:re.resolve(t)}catch(e){return re.reject(e)}}wrapSuccess(e,t){return e?this.wrapUserFunction(()=>e(t)):re.resolve(t)}wrapFailure(e,t){return e?this.wrapUserFunction(()=>e(t)):re.reject(t)}static resolve(e){return new re((t,n)=>{t(e)})}static reject(e){return new re((t,n)=>{n(e)})}static waitFor(e){return new re((t,n)=>{let r=0,s=0,i=!1;e.forEach(e=>{++r,e.next(()=>{++s,i&&s===r&&t()},e=>n(e))}),i=!0,s===r&&t()})}static or(e){let t=re.resolve(!1);for(const n of e)t=t.next(e=>e?re.resolve(e):n());return t}static forEach(e,t){const n=[];return e.forEach((e,r)=>{n.push(t.call(this,e,r))}),this.waitFor(n)}static mapArray(e,t){return new re((n,r)=>{const s=e.length,i=new Array(s);let o=0;for(let a=0;a<s;a++){const u=a;t(e[u]).next(e=>{i[u]=e,++o,o===s&&n(i)},e=>r(e))}})}static doWhile(e,t){return new re((n,r)=>{const s=()=>{!0===e()?t().next(()=>{s()},r):n()};s()})}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class se{constructor(e,t){this.action=e,this.transaction=t,this.aborted=!1,this.V=new _,this.transaction.oncomplete=()=>{this.V.resolve()},this.transaction.onabort=()=>{t.error?this.V.reject(new ue(e,t.error)):this.V.resolve()},this.transaction.onerror=t=>{const n=fe(t.target.error);this.V.reject(new ue(e,n))}}static open(e,t,n,r){try{return new se(t,e.transaction(r,n))}catch(e){throw new ue(t,e)}}get m(){return this.V.promise}abort(e){e&&this.V.reject(e),this.aborted||(g("SimpleDb","Aborting transaction:",e?e.message:"Client-initiated abort"),this.aborted=!0,this.transaction.abort())}g(){const e=this.transaction;this.aborted||"function"!=typeof e.commit||e.commit()}store(e){const t=this.transaction.objectStore(e);return new le(t)}}class ie{constructor(e,t,n){this.name=e,this.version=t,this.p=n,12.2===ie.S(Object(a["r"])())&&p("Firestore persistence suffers from a bug in iOS 12.2 Safari that may cause your app to stop working. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.")}static delete(e){return g("SimpleDb","Removing database:",e),he(window.indexedDB.deleteDatabase(e)).toPromise()}static D(){if(!Object(a["v"])())return!1;if(ie.C())return!0;const e=Object(a["r"])(),t=ie.S(e),n=0<t&&t<10,r=oe(e),s=0<r&&r<4.5;return!(e.indexOf("MSIE ")>0||e.indexOf("Trident/")>0||e.indexOf("Edge/")>0||n||s)}static C(){var t;return"undefined"!=typeof e&&"YES"===(null===(t=e.__PRIVATE_env)||void 0===t?void 0:t.v)}static F(e,t){return e.store(t)}static S(e){const t=e.match(/i(?:phone|pad|pod) os ([\d_]+)/i),n=t?t[1].split("_").slice(0,2).join("."):"-1";return Number(n)}async M(e){return this.db||(g("SimpleDb","Opening database:",this.name),this.db=await new Promise((t,n)=>{const r=indexedDB.open(this.name,this.version);r.onsuccess=e=>{const n=e.target.result;t(n)},r.onblocked=()=>{n(new ue(e,"Cannot upgrade IndexedDB schema while another tab is open. Close all tabs that access Firestore and reload this page to proceed."))},r.onerror=t=>{const r=t.target.error;"VersionError"===r.name?n(new T(E.FAILED_PRECONDITION,"A newer version of the Firestore SDK was previously used and so the persisted data is not compatible with the version of the SDK you are now using. The SDK will operate with persistence disabled. If you need persistence, please re-upgrade to a newer version of the SDK or else clear the persisted IndexedDB data for your app to start fresh.")):"InvalidStateError"===r.name?n(new T(E.FAILED_PRECONDITION,"Unable to open an IndexedDB connection. This could be due to running in a private browsing session on a browser whose private browsing sessions do not support IndexedDB: "+r)):n(new ue(e,r))},r.onupgradeneeded=e=>{g("SimpleDb",'Database "'+this.name+'" requires upgrade from version:',e.oldVersion);const t=e.target.result;this.p.O(t,r.transaction,e.oldVersion,this.version).next(()=>{g("SimpleDb","Database upgrade to version "+this.version+" complete")})}})),this.N&&(this.db.onversionchange=e=>this.N(e)),this.db}L(e){this.N=e,this.db&&(this.db.onversionchange=t=>e(t))}async runTransaction(e,t,n,r){const s="readonly"===t;let i=0;for(;;){++i;try{this.db=await this.M(e);const t=se.open(this.db,e,s?"readonly":"readwrite",n),i=r(t).next(e=>(t.g(),e)).catch(e=>(t.abort(e),re.reject(e))).toPromise();return i.catch(()=>{}),await t.m,i}catch(e){const t=e,n="FirebaseError"!==t.name&&i<3;if(g("SimpleDb","Transaction failed with error:",t.message,"Retrying:",n),this.close(),!n)return Promise.reject(t)}}}close(){this.db&&this.db.close(),this.db=void 0}}function oe(e){const t=e.match(/Android ([\d.]+)/i),n=t?t[1].split(".").slice(0,2).join("."):"-1";return Number(n)}class ae{constructor(e){this.B=e,this.k=!1,this.q=null}get isDone(){return this.k}get K(){return this.q}set cursor(e){this.B=e}done(){this.k=!0}$(e){this.q=e}delete(){return he(this.B.delete())}}class ue extends T{constructor(e,t){super(E.UNAVAILABLE,`IndexedDB transaction '${e}' failed: ${t}`),this.name="IndexedDbTransactionError"}}function ce(e){return"IndexedDbTransactionError"===e.name}class le{constructor(e){this.store=e}put(e,t){let n;return void 0!==t?(g("SimpleDb","PUT",this.store.name,e,t),n=this.store.put(t,e)):(g("SimpleDb","PUT",this.store.name,"<auto-key>",e),n=this.store.put(e)),he(n)}add(e){return g("SimpleDb","ADD",this.store.name,e,e),he(this.store.add(e))}get(e){return he(this.store.get(e)).next(t=>(void 0===t&&(t=null),g("SimpleDb","GET",this.store.name,e,t),t))}delete(e){return g("SimpleDb","DELETE",this.store.name,e),he(this.store.delete(e))}count(){return g("SimpleDb","COUNT",this.store.name),he(this.store.count())}U(e,t){const n=this.options(e,t),r=n.index?this.store.index(n.index):this.store;if("function"==typeof r.getAll){const e=r.getAll(n.range);return new re((t,n)=>{e.onerror=e=>{n(e.target.error)},e.onsuccess=e=>{t(e.target.result)}})}{const e=this.cursor(n),t=[];return this.W(e,(e,n)=>{t.push(n)}).next(()=>t)}}G(e,t){const n=this.store.getAll(e,null===t?void 0:t);return new re((e,t)=>{n.onerror=e=>{t(e.target.error)},n.onsuccess=t=>{e(t.target.result)}})}j(e,t){g("SimpleDb","DELETE ALL",this.store.name);const n=this.options(e,t);n.H=!1;const r=this.cursor(n);return this.W(r,(e,t,n)=>n.delete())}J(e,t){let n;t?n=e:(n={},t=e);const r=this.cursor(n);return this.W(r,t)}Y(e){const t=this.cursor({});return new re((n,r)=>{t.onerror=e=>{const t=fe(e.target.error);r(t)},t.onsuccess=t=>{const r=t.target.result;r?e(r.primaryKey,r.value).next(e=>{e?r.continue():n()}):n()}})}W(e,t){const n=[];return new re((r,s)=>{e.onerror=e=>{s(e.target.error)},e.onsuccess=e=>{const s=e.target.result;if(!s)return void r();const i=new ae(s),o=t(s.primaryKey,s.value,i);if(o instanceof re){const e=o.catch(e=>(i.done(),re.reject(e)));n.push(e)}i.isDone?r():null===i.K?s.continue():s.continue(i.K)}}).next(()=>re.waitFor(n))}options(e,t){let n;return void 0!==e&&("string"==typeof e?n=e:t=e),{index:n,range:t}}cursor(e){let t="next";if(e.reverse&&(t="prev"),e.index){const n=this.store.index(e.index);return e.H?n.openKeyCursor(e.range,t):n.openCursor(e.range,t)}return this.store.openCursor(e.range,t)}}function he(e){return new re((t,n)=>{e.onsuccess=e=>{const n=e.target.result;t(n)},e.onerror=e=>{const t=fe(e.target.error);n(t)}})}let de=!1;function fe(e){const t=ie.S(Object(a["r"])());if(t>=12.2&&t<13){const t="An internal error was encountered in the Indexed Database server";if(e.message.indexOf(t)>=0){const e=new T("internal",`IOS_INDEXEDDB_BUG1: IndexedDb has thrown '${t}'. This is likely due to an unavoidable bug in iOS. See https://stackoverflow.com/q/56496296/110915 for details and a potential workaround.`);return de||(de=!0,setTimeout(()=>{throw e},0)),e}}return e}class me{constructor(e,t){this.asyncQueue=e,this.Z=t,this.task=null}start(){this.X(15e3)}stop(){this.task&&(this.task.cancel(),this.task=null)}get started(){return null!==this.task}X(e){g("IndexBackfiller",`Scheduled in ${e}ms`),this.task=this.asyncQueue.enqueueAfterDelay("index_backfill",e,async()=>{this.task=null;try{g("IndexBackfiller","Documents written: "+await this.Z.ee())}catch(e){ce(e)?g("IndexBackfiller","Ignoring IndexedDB error during index backfill: ",e):await ne(e)}await this.X(6e4)})}}class ge{constructor(e,t){this.localStore=e,this.persistence=t}async ee(e=50){return this.persistence.runTransaction("Backfill Indexes","readwrite-primary",t=>this.te(t,e))}te(e,t){const n=new Set;let r=t,s=!0;return re.doWhile(()=>!0===s&&r>0,()=>this.localStore.indexManager.getNextCollectionGroupToUpdate(e).next(t=>{if(null!==t&&!n.has(t))return g("IndexBackfiller","Processing collection: "+t),this.ne(e,t,r).next(e=>{r-=e,n.add(t)});s=!1})).next(()=>t-r)}ne(e,t,n){return this.localStore.indexManager.getMinOffsetFromCollectionGroup(e,t).next(r=>this.localStore.localDocuments.getNextDocuments(e,t,r,n).next(n=>{const s=n.changes;return this.localStore.indexManager.updateIndexEntries(e,s).next(()=>this.re(r,n)).next(n=>(g("IndexBackfiller","Updating offset: "+n),this.localStore.indexManager.updateCollectionGroup(e,t,n))).next(()=>s.size)}))}re(e,t){let n=e;return t.changes.forEach((e,t)=>{const r=Y(t);Z(r,n)>0&&(n=r)}),new X(n.readTime,n.documentKey,Math.max(t.batchId,e.largestBatchId))}}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pe{constructor(e,t){this.previousValue=e,t&&(t.sequenceNumberHandler=e=>this.ie(e),this.se=e=>t.writeSequenceNumber(e))}ie(e){return this.previousValue=Math.max(e,this.previousValue),this.previousValue}next(){const e=++this.previousValue;return this.se&&this.se(e),e}}function ye(e){return null==e}function we(e){return 0===e&&1/e==-1/0}function ve(e){return"number"==typeof e&&Number.isInteger(e)&&!we(e)&&e<=Number.MAX_SAFE_INTEGER&&e>=Number.MIN_SAFE_INTEGER}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ie(e){let t="";for(let n=0;n<e.length;n++)t.length>0&&(t=Ee(t)),t=be(e.get(n),t);return Ee(t)}function be(e,t){let n=t;const r=e.length;for(let s=0;s<r;s++){const t=e.charAt(s);switch(t){case"\0":n+="";break;case"":n+="";break;default:n+=t}}return n}function Ee(e){return e+""}function Te(e){const t=e.length;if(I(t>=2),2===t)return I(""===e.charAt(0)&&""===e.charAt(1)),B.emptyPath();const n=t-2,r=[];let s="";for(let i=0;i<t;){const t=e.indexOf("",i);switch((t<0||t>n)&&v(),e.charAt(t+1)){case"":const n=e.substring(i,t);let o;0===s.length?o=n:(s+=n,o=s,s=""),r.push(o);break;case"":s+=e.substring(i,t),s+="\0";break;case"":s+=e.substring(i,t+1);break;default:v()}i=t+2}return new B(r)}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */pe.oe=-1;const _e=["userId","batchId"];
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Se(e,t){return[e,Ie(t)]}function xe(e,t,n){return[e,Ie(t),n]}const Ce={},De=["prefixPath","collectionGroup","readTime","documentId"],ke=["prefixPath","collectionGroup","documentId"],Ne=["collectionGroup","readTime","prefixPath","documentId"],Ae=["canonicalId","targetId"],Me=["targetId","path"],Re=["path","targetId"],Ve=["collectionId","parent"],Oe=["indexId","uid"],Fe=["uid","sequenceNumber"],Le=["indexId","uid","arrayValue","directionalValue","orderedDocumentKey","documentKey"],Pe=["indexId","uid","orderedDocumentKey"],Ue=["userId","collectionPath","documentId"],qe=["userId","collectionPath","largestBatchId"],Be=["userId","collectionGroup","largestBatchId"],ze=["mutationQueues","mutations","documentMutations","remoteDocuments","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries"],Ge=[...ze,"documentOverlays"],Ke=["mutationQueues","mutations","documentMutations","remoteDocumentsV14","targets","owner","targetGlobal","targetDocuments","clientMetadata","remoteDocumentGlobal","collectionParents","bundles","namedQueries","documentOverlays"],je=Ke,$e=[...je,"indexConfiguration","indexState","indexEntries"],Qe=$e;
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class He extends te{constructor(e,t){super(),this._e=e,this.currentSequenceNumber=t}}function We(e,t){const n=b(e);return ie.F(n._e,t)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Je(e){let t=0;for(const n in e)Object.prototype.hasOwnProperty.call(e,n)&&t++;return t}function Ye(e,t){for(const n in e)Object.prototype.hasOwnProperty.call(e,n)&&t(n,e[n])}function Xe(e){for(const t in e)if(Object.prototype.hasOwnProperty.call(e,t))return!1;return!0}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ze{constructor(e,t){this.comparator=e,this.root=t||tt.EMPTY}insert(e,t){return new Ze(this.comparator,this.root.insert(e,t,this.comparator).copy(null,null,tt.BLACK,null,null))}remove(e){return new Ze(this.comparator,this.root.remove(e,this.comparator).copy(null,null,tt.BLACK,null,null))}get(e){let t=this.root;for(;!t.isEmpty();){const n=this.comparator(e,t.key);if(0===n)return t.value;n<0?t=t.left:n>0&&(t=t.right)}return null}indexOf(e){let t=0,n=this.root;for(;!n.isEmpty();){const r=this.comparator(e,n.key);if(0===r)return t+n.left.size;r<0?n=n.left:(t+=n.left.size+1,n=n.right)}return-1}isEmpty(){return this.root.isEmpty()}get size(){return this.root.size}minKey(){return this.root.minKey()}maxKey(){return this.root.maxKey()}inorderTraversal(e){return this.root.inorderTraversal(e)}forEach(e){this.inorderTraversal((t,n)=>(e(t,n),!1))}toString(){const e=[];return this.inorderTraversal((t,n)=>(e.push(`${t}:${n}`),!1)),`{${e.join(", ")}}`}reverseTraversal(e){return this.root.reverseTraversal(e)}getIterator(){return new et(this.root,null,this.comparator,!1)}getIteratorFrom(e){return new et(this.root,e,this.comparator,!1)}getReverseIterator(){return new et(this.root,null,this.comparator,!0)}getReverseIteratorFrom(e){return new et(this.root,e,this.comparator,!0)}}class et{constructor(e,t,n,r){this.isReverse=r,this.nodeStack=[];let s=1;for(;!e.isEmpty();)if(s=t?n(e.key,t):1,t&&r&&(s*=-1),s<0)e=this.isReverse?e.left:e.right;else{if(0===s){this.nodeStack.push(e);break}this.nodeStack.push(e),e=this.isReverse?e.right:e.left}}getNext(){let e=this.nodeStack.pop();const t={key:e.key,value:e.value};if(this.isReverse)for(e=e.left;!e.isEmpty();)this.nodeStack.push(e),e=e.right;else for(e=e.right;!e.isEmpty();)this.nodeStack.push(e),e=e.left;return t}hasNext(){return this.nodeStack.length>0}peek(){if(0===this.nodeStack.length)return null;const e=this.nodeStack[this.nodeStack.length-1];return{key:e.key,value:e.value}}}class tt{constructor(e,t,n,r,s){this.key=e,this.value=t,this.color=null!=n?n:tt.RED,this.left=null!=r?r:tt.EMPTY,this.right=null!=s?s:tt.EMPTY,this.size=this.left.size+1+this.right.size}copy(e,t,n,r,s){return new tt(null!=e?e:this.key,null!=t?t:this.value,null!=n?n:this.color,null!=r?r:this.left,null!=s?s:this.right)}isEmpty(){return!1}inorderTraversal(e){return this.left.inorderTraversal(e)||e(this.key,this.value)||this.right.inorderTraversal(e)}reverseTraversal(e){return this.right.reverseTraversal(e)||e(this.key,this.value)||this.left.reverseTraversal(e)}min(){return this.left.isEmpty()?this:this.left.min()}minKey(){return this.min().key}maxKey(){return this.right.isEmpty()?this.key:this.right.maxKey()}insert(e,t,n){let r=this;const s=n(e,r.key);return r=s<0?r.copy(null,null,null,r.left.insert(e,t,n),null):0===s?r.copy(null,t,null,null,null):r.copy(null,null,null,null,r.right.insert(e,t,n)),r.fixUp()}removeMin(){if(this.left.isEmpty())return tt.EMPTY;let e=this;return e.left.isRed()||e.left.left.isRed()||(e=e.moveRedLeft()),e=e.copy(null,null,null,e.left.removeMin(),null),e.fixUp()}remove(e,t){let n,r=this;if(t(e,r.key)<0)r.left.isEmpty()||r.left.isRed()||r.left.left.isRed()||(r=r.moveRedLeft()),r=r.copy(null,null,null,r.left.remove(e,t),null);else{if(r.left.isRed()&&(r=r.rotateRight()),r.right.isEmpty()||r.right.isRed()||r.right.left.isRed()||(r=r.moveRedRight()),0===t(e,r.key)){if(r.right.isEmpty())return tt.EMPTY;n=r.right.min(),r=r.copy(n.key,n.value,null,null,r.right.removeMin())}r=r.copy(null,null,null,null,r.right.remove(e,t))}return r.fixUp()}isRed(){return this.color}fixUp(){let e=this;return e.right.isRed()&&!e.left.isRed()&&(e=e.rotateLeft()),e.left.isRed()&&e.left.left.isRed()&&(e=e.rotateRight()),e.left.isRed()&&e.right.isRed()&&(e=e.colorFlip()),e}moveRedLeft(){let e=this.colorFlip();return e.right.left.isRed()&&(e=e.copy(null,null,null,null,e.right.rotateRight()),e=e.rotateLeft(),e=e.colorFlip()),e}moveRedRight(){let e=this.colorFlip();return e.left.left.isRed()&&(e=e.rotateRight(),e=e.colorFlip()),e}rotateLeft(){const e=this.copy(null,null,tt.RED,null,this.right.left);return this.right.copy(null,null,this.color,e,null)}rotateRight(){const e=this.copy(null,null,tt.RED,this.left.right,null);return this.left.copy(null,null,this.color,null,e)}colorFlip(){const e=this.left.copy(null,null,!this.left.color,null,null),t=this.right.copy(null,null,!this.right.color,null,null);return this.copy(null,null,!this.color,e,t)}checkMaxDepth(){const e=this.check();return Math.pow(2,e)<=this.size+1}check(){if(this.isRed()&&this.left.isRed())throw v();if(this.right.isRed())throw v();const e=this.left.check();if(e!==this.right.check())throw v();return e+(this.isRed()?0:1)}}tt.EMPTY=null,tt.RED=!0,tt.BLACK=!1,tt.EMPTY=new class{constructor(){this.size=0}get key(){throw v()}get value(){throw v()}get color(){throw v()}get left(){throw v()}get right(){throw v()}copy(e,t,n,r,s){return this}insert(e,t,n){return new tt(e,t)}remove(e,t){return this}isEmpty(){return!0}inorderTraversal(e){return!1}reverseTraversal(e){return!1}minKey(){return null}maxKey(){return null}isRed(){return!1}checkMaxDepth(){return!0}check(){return 0}};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class nt{constructor(e){this.comparator=e,this.data=new Ze(this.comparator)}has(e){return null!==this.data.get(e)}first(){return this.data.minKey()}last(){return this.data.maxKey()}get size(){return this.data.size}indexOf(e){return this.data.indexOf(e)}forEach(e){this.data.inorderTraversal((t,n)=>(e(t),!1))}forEachInRange(e,t){const n=this.data.getIteratorFrom(e[0]);for(;n.hasNext();){const r=n.getNext();if(this.comparator(r.key,e[1])>=0)return;t(r.key)}}forEachWhile(e,t){let n;for(n=void 0!==t?this.data.getIteratorFrom(t):this.data.getIterator();n.hasNext();)if(!e(n.getNext().key))return}firstAfterOrEqual(e){const t=this.data.getIteratorFrom(e);return t.hasNext()?t.getNext().key:null}getIterator(){return new rt(this.data.getIterator())}getIteratorFrom(e){return new rt(this.data.getIteratorFrom(e))}add(e){return this.copy(this.data.remove(e).insert(e,!0))}delete(e){return this.has(e)?this.copy(this.data.remove(e)):this}isEmpty(){return this.data.isEmpty()}unionWith(e){let t=this;return t.size<e.size&&(t=e,e=this),e.forEach(e=>{t=t.add(e)}),t}isEqual(e){if(!(e instanceof nt))return!1;if(this.size!==e.size)return!1;const t=this.data.getIterator(),n=e.data.getIterator();for(;t.hasNext();){const e=t.getNext().key,r=n.getNext().key;if(0!==this.comparator(e,r))return!1}return!0}toArray(){const e=[];return this.forEach(t=>{e.push(t)}),e}toString(){const e=[];return this.forEach(t=>e.push(t)),"SortedSet("+e.toString()+")"}copy(e){const t=new nt(this.comparator);return t.data=e,t}}class rt{constructor(e){this.iter=e}getNext(){return this.iter.getNext().key}hasNext(){return this.iter.hasNext()}}function st(e){return e.hasNext()?e.getNext():void 0}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class it{constructor(e){this.fields=e,e.sort(G.comparator)}static empty(){return new it([])}unionWith(e){let t=new nt(G.comparator);for(const n of this.fields)t=t.add(n);for(const n of e)t=t.add(n);return new it(t.toArray())}covers(e){for(const t of this.fields)if(t.isPrefixOf(e))return!0;return!1}isEqual(e){return F(this.fields,e.fields,(e,t)=>e.isEqual(t))}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ot extends Error{constructor(){super(...arguments),this.name="Base64DecodeError"}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class at{constructor(e){this.binaryString=e}static fromBase64String(e){const t=function(e){try{return atob(e)}catch(e){throw"undefined"!=typeof DOMException&&e instanceof DOMException?new ot("Invalid base64 string: "+e):e}}(e);return new at(t)}static fromUint8Array(e){const t=function(e){let t="";for(let n=0;n<e.length;++n)t+=String.fromCharCode(e[n]);return t}(e);return new at(t)}[Symbol.iterator](){let e=0;return{next:()=>e<this.binaryString.length?{value:this.binaryString.charCodeAt(e++),done:!1}:{value:void 0,done:!0}}}toBase64(){return function(e){return btoa(e)}(this.binaryString)}toUint8Array(){return function(e){const t=new Uint8Array(e.length);for(let n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(this.binaryString)}approximateByteSize(){return 2*this.binaryString.length}compareTo(e){return O(this.binaryString,e.binaryString)}isEqual(e){return this.binaryString===e.binaryString}}at.EMPTY_BYTE_STRING=new at("");const ut=new RegExp(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.(\d+))?Z$/);function ct(e){if(I(!!e),"string"==typeof e){let t=0;const n=ut.exec(e);if(I(!!n),n[1]){let e=n[1];e=(e+"000000000").substr(0,9),t=Number(e)}const r=new Date(e);return{seconds:Math.floor(r.getTime()/1e3),nanos:t}}return{seconds:lt(e.seconds),nanos:lt(e.nanos)}}function lt(e){return"number"==typeof e?e:"string"==typeof e?Number(e):0}function ht(e){return"string"==typeof e?at.fromBase64String(e):at.fromUint8Array(e)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function dt(e){var t,n;return"server_timestamp"===(null===(n=((null===(t=null==e?void 0:e.mapValue)||void 0===t?void 0:t.fields)||{}).__type__)||void 0===n?void 0:n.stringValue)}function ft(e){const t=e.mapValue.fields.__previous_value__;return dt(t)?ft(t):t}function mt(e){const t=ct(e.mapValue.fields.__local_write_time__.timestampValue);return new P(t.seconds,t.nanos)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class gt{constructor(e,t,n,r,s,i,o,a,u){this.databaseId=e,this.appId=t,this.persistenceKey=n,this.host=r,this.ssl=s,this.forceLongPolling=i,this.autoDetectLongPolling=o,this.longPollingOptions=a,this.useFetchStreams=u}}class pt{constructor(e,t){this.projectId=e,this.database=t||"(default)"}static empty(){return new pt("","")}get isDefaultDatabase(){return"(default)"===this.database}isEqual(e){return e instanceof pt&&e.projectId===this.projectId&&e.database===this.database}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const yt={mapValue:{fields:{__type__:{stringValue:"__max__"}}}},wt={nullValue:"NULL_VALUE"};function vt(e){return"nullValue"in e?0:"booleanValue"in e?1:"integerValue"in e||"doubleValue"in e?2:"timestampValue"in e?3:"stringValue"in e?5:"bytesValue"in e?6:"referenceValue"in e?7:"geoPointValue"in e?8:"arrayValue"in e?9:"mapValue"in e?dt(e)?4:Rt(e)?9007199254740991:10:v()}function It(e,t){if(e===t)return!0;const n=vt(e);if(n!==vt(t))return!1;switch(n){case 0:case 9007199254740991:return!0;case 1:return e.booleanValue===t.booleanValue;case 4:return mt(e).isEqual(mt(t));case 3:return function(e,t){if("string"==typeof e.timestampValue&&"string"==typeof t.timestampValue&&e.timestampValue.length===t.timestampValue.length)return e.timestampValue===t.timestampValue;const n=ct(e.timestampValue),r=ct(t.timestampValue);return n.seconds===r.seconds&&n.nanos===r.nanos}(e,t);case 5:return e.stringValue===t.stringValue;case 6:return function(e,t){return ht(e.bytesValue).isEqual(ht(t.bytesValue))}(e,t);case 7:return e.referenceValue===t.referenceValue;case 8:return function(e,t){return lt(e.geoPointValue.latitude)===lt(t.geoPointValue.latitude)&&lt(e.geoPointValue.longitude)===lt(t.geoPointValue.longitude)}(e,t);case 2:return function(e,t){if("integerValue"in e&&"integerValue"in t)return lt(e.integerValue)===lt(t.integerValue);if("doubleValue"in e&&"doubleValue"in t){const n=lt(e.doubleValue),r=lt(t.doubleValue);return n===r?we(n)===we(r):isNaN(n)&&isNaN(r)}return!1}(e,t);case 9:return F(e.arrayValue.values||[],t.arrayValue.values||[],It);case 10:return function(e,t){const n=e.mapValue.fields||{},r=t.mapValue.fields||{};if(Je(n)!==Je(r))return!1;for(const s in n)if(n.hasOwnProperty(s)&&(void 0===r[s]||!It(n[s],r[s])))return!1;return!0}(e,t);default:return v()}}function bt(e,t){return void 0!==(e.values||[]).find(e=>It(e,t))}function Et(e,t){if(e===t)return 0;const n=vt(e),r=vt(t);if(n!==r)return O(n,r);switch(n){case 0:case 9007199254740991:return 0;case 1:return O(e.booleanValue,t.booleanValue);case 2:return function(e,t){const n=lt(e.integerValue||e.doubleValue),r=lt(t.integerValue||t.doubleValue);return n<r?-1:n>r?1:n===r?0:isNaN(n)?isNaN(r)?0:-1:1}(e,t);case 3:return Tt(e.timestampValue,t.timestampValue);case 4:return Tt(mt(e),mt(t));case 5:return O(e.stringValue,t.stringValue);case 6:return function(e,t){const n=ht(e),r=ht(t);return n.compareTo(r)}(e.bytesValue,t.bytesValue);case 7:return function(e,t){const n=e.split("/"),r=t.split("/");for(let s=0;s<n.length&&s<r.length;s++){const e=O(n[s],r[s]);if(0!==e)return e}return O(n.length,r.length)}(e.referenceValue,t.referenceValue);case 8:return function(e,t){const n=O(lt(e.latitude),lt(t.latitude));return 0!==n?n:O(lt(e.longitude),lt(t.longitude))}(e.geoPointValue,t.geoPointValue);case 9:return function(e,t){const n=e.values||[],r=t.values||[];for(let s=0;s<n.length&&s<r.length;++s){const e=Et(n[s],r[s]);if(e)return e}return O(n.length,r.length)}(e.arrayValue,t.arrayValue);case 10:return function(e,t){if(e===yt.mapValue&&t===yt.mapValue)return 0;if(e===yt.mapValue)return 1;if(t===yt.mapValue)return-1;const n=e.fields||{},r=Object.keys(n),s=t.fields||{},i=Object.keys(s);r.sort(),i.sort();for(let o=0;o<r.length&&o<i.length;++o){const e=O(r[o],i[o]);if(0!==e)return e;const t=Et(n[r[o]],s[i[o]]);if(0!==t)return t}return O(r.length,i.length)}(e.mapValue,t.mapValue);default:throw v()}}function Tt(e,t){if("string"==typeof e&&"string"==typeof t&&e.length===t.length)return O(e,t);const n=ct(e),r=ct(t),s=O(n.seconds,r.seconds);return 0!==s?s:O(n.nanos,r.nanos)}function _t(e){return St(e)}function St(e){return"nullValue"in e?"null":"booleanValue"in e?""+e.booleanValue:"integerValue"in e?""+e.integerValue:"doubleValue"in e?""+e.doubleValue:"timestampValue"in e?function(e){const t=ct(e);return`time(${t.seconds},${t.nanos})`}(e.timestampValue):"stringValue"in e?e.stringValue:"bytesValue"in e?function(e){return ht(e).toBase64()}(e.bytesValue):"referenceValue"in e?function(e){return K.fromName(e).toString()}(e.referenceValue):"geoPointValue"in e?function(e){return`geo(${e.latitude},${e.longitude})`}(e.geoPointValue):"arrayValue"in e?function(e){let t="[",n=!0;for(const r of e.values||[])n?n=!1:t+=",",t+=St(r);return t+"]"}(e.arrayValue):"mapValue"in e?function(e){const t=Object.keys(e.fields||{}).sort();let n="{",r=!0;for(const s of t)r?r=!1:n+=",",n+=`${s}:${St(e.fields[s])}`;return n+"}"}(e.mapValue):v()}function xt(e,t){return{referenceValue:`projects/${e.projectId}/databases/${e.database}/documents/${t.path.canonicalString()}`}}function Ct(e){return!!e&&"integerValue"in e}function Dt(e){return!!e&&"arrayValue"in e}function kt(e){return!!e&&"nullValue"in e}function Nt(e){return!!e&&"doubleValue"in e&&isNaN(Number(e.doubleValue))}function At(e){return!!e&&"mapValue"in e}function Mt(e){if(e.geoPointValue)return{geoPointValue:Object.assign({},e.geoPointValue)};if(e.timestampValue&&"object"==typeof e.timestampValue)return{timestampValue:Object.assign({},e.timestampValue)};if(e.mapValue){const t={mapValue:{fields:{}}};return Ye(e.mapValue.fields,(e,n)=>t.mapValue.fields[e]=Mt(n)),t}if(e.arrayValue){const t={arrayValue:{values:[]}};for(let n=0;n<(e.arrayValue.values||[]).length;++n)t.arrayValue.values[n]=Mt(e.arrayValue.values[n]);return t}return Object.assign({},e)}function Rt(e){return"__max__"===(((e.mapValue||{}).fields||{}).__type__||{}).stringValue}function Vt(e){return"nullValue"in e?wt:"booleanValue"in e?{booleanValue:!1}:"integerValue"in e||"doubleValue"in e?{doubleValue:NaN}:"timestampValue"in e?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"stringValue"in e?{stringValue:""}:"bytesValue"in e?{bytesValue:""}:"referenceValue"in e?xt(pt.empty(),K.empty()):"geoPointValue"in e?{geoPointValue:{latitude:-90,longitude:-180}}:"arrayValue"in e?{arrayValue:{}}:"mapValue"in e?{mapValue:{}}:v()}function Ot(e){return"nullValue"in e?{booleanValue:!1}:"booleanValue"in e?{doubleValue:NaN}:"integerValue"in e||"doubleValue"in e?{timestampValue:{seconds:Number.MIN_SAFE_INTEGER}}:"timestampValue"in e?{stringValue:""}:"stringValue"in e?{bytesValue:""}:"bytesValue"in e?xt(pt.empty(),K.empty()):"referenceValue"in e?{geoPointValue:{latitude:-90,longitude:-180}}:"geoPointValue"in e?{arrayValue:{}}:"arrayValue"in e?{mapValue:{}}:"mapValue"in e?yt:v()}function Ft(e,t){const n=Et(e.value,t.value);return 0!==n?n:e.inclusive&&!t.inclusive?-1:!e.inclusive&&t.inclusive?1:0}function Lt(e,t){const n=Et(e.value,t.value);return 0!==n?n:e.inclusive&&!t.inclusive?1:!e.inclusive&&t.inclusive?-1:0}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Pt{constructor(e){this.value=e}static empty(){return new Pt({mapValue:{}})}field(e){if(e.isEmpty())return this.value;{let t=this.value;for(let n=0;n<e.length-1;++n)if(t=(t.mapValue.fields||{})[e.get(n)],!At(t))return null;return t=(t.mapValue.fields||{})[e.lastSegment()],t||null}}set(e,t){this.getFieldsMap(e.popLast())[e.lastSegment()]=Mt(t)}setAll(e){let t=G.emptyPath(),n={},r=[];e.forEach((e,s)=>{if(!t.isImmediateParentOf(s)){const e=this.getFieldsMap(t);this.applyChanges(e,n,r),n={},r=[],t=s.popLast()}e?n[s.lastSegment()]=Mt(e):r.push(s.lastSegment())});const s=this.getFieldsMap(t);this.applyChanges(s,n,r)}delete(e){const t=this.field(e.popLast());At(t)&&t.mapValue.fields&&delete t.mapValue.fields[e.lastSegment()]}isEqual(e){return It(this.value,e.value)}getFieldsMap(e){let t=this.value;t.mapValue.fields||(t.mapValue={fields:{}});for(let n=0;n<e.length;++n){let r=t.mapValue.fields[e.get(n)];At(r)&&r.mapValue.fields||(r={mapValue:{fields:{}}},t.mapValue.fields[e.get(n)]=r),t=r}return t.mapValue.fields}applyChanges(e,t,n){Ye(t,(t,n)=>e[t]=n);for(const r of n)delete e[r]}clone(){return new Pt(Mt(this.value))}}function Ut(e){const t=[];return Ye(e.fields,(e,n)=>{const r=new G([e]);if(At(n)){const e=Ut(n.mapValue).fields;if(0===e.length)t.push(r);else for(const n of e)t.push(r.child(n))}else t.push(r)}),new it(t)
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class qt{constructor(e,t,n,r,s,i,o){this.key=e,this.documentType=t,this.version=n,this.readTime=r,this.createTime=s,this.data=i,this.documentState=o}static newInvalidDocument(e){return new qt(e,0,U.min(),U.min(),U.min(),Pt.empty(),0)}static newFoundDocument(e,t,n,r){return new qt(e,1,t,U.min(),n,r,0)}static newNoDocument(e,t){return new qt(e,2,t,U.min(),U.min(),Pt.empty(),0)}static newUnknownDocument(e,t){return new qt(e,3,t,U.min(),U.min(),Pt.empty(),2)}convertToFoundDocument(e,t){return!this.createTime.isEqual(U.min())||2!==this.documentType&&0!==this.documentType||(this.createTime=e),this.version=e,this.documentType=1,this.data=t,this.documentState=0,this}convertToNoDocument(e){return this.version=e,this.documentType=2,this.data=Pt.empty(),this.documentState=0,this}convertToUnknownDocument(e){return this.version=e,this.documentType=3,this.data=Pt.empty(),this.documentState=2,this}setHasCommittedMutations(){return this.documentState=2,this}setHasLocalMutations(){return this.documentState=1,this.version=U.min(),this}setReadTime(e){return this.readTime=e,this}get hasLocalMutations(){return 1===this.documentState}get hasCommittedMutations(){return 2===this.documentState}get hasPendingWrites(){return this.hasLocalMutations||this.hasCommittedMutations}isValidDocument(){return 0!==this.documentType}isFoundDocument(){return 1===this.documentType}isNoDocument(){return 2===this.documentType}isUnknownDocument(){return 3===this.documentType}isEqual(e){return e instanceof qt&&this.key.isEqual(e.key)&&this.version.isEqual(e.version)&&this.documentType===e.documentType&&this.documentState===e.documentState&&this.data.isEqual(e.data)}mutableCopy(){return new qt(this.key,this.documentType,this.version,this.readTime,this.createTime,this.data.clone(),this.documentState)}toString(){return`Document(${this.key}, ${this.version}, ${JSON.stringify(this.data.value)}, {createTime: ${this.createTime}}), {documentType: ${this.documentType}}), {documentState: ${this.documentState}})`}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bt{constructor(e,t){this.position=e,this.inclusive=t}}function zt(e,t,n){let r=0;for(let s=0;s<e.position.length;s++){const i=t[s],o=e.position[s];if(r=i.field.isKeyField()?K.comparator(K.fromName(o.referenceValue),n.key):Et(o,n.data.field(i.field)),"desc"===i.dir&&(r*=-1),0!==r)break}return r}function Gt(e,t){if(null===e)return null===t;if(null===t)return!1;if(e.inclusive!==t.inclusive||e.position.length!==t.position.length)return!1;for(let n=0;n<e.position.length;n++)if(!It(e.position[n],t.position[n]))return!1;return!0}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Kt{constructor(e,t="asc"){this.field=e,this.dir=t}}function jt(e,t){return e.dir===t.dir&&e.field.isEqual(t.field)}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class $t{}class Qt extends $t{constructor(e,t,n){super(),this.field=e,this.op=t,this.value=n}static create(e,t,n){return e.isKeyField()?"in"===t||"not-in"===t?this.createKeyFieldInFilter(e,t,n):new rn(e,t,n):"array-contains"===t?new un(e,n):"in"===t?new cn(e,n):"not-in"===t?new ln(e,n):"array-contains-any"===t?new hn(e,n):new Qt(e,t,n)}static createKeyFieldInFilter(e,t,n){return"in"===t?new sn(e,n):new on(e,n)}matches(e){const t=e.data.field(this.field);return"!="===this.op?null!==t&&this.matchesComparison(Et(t,this.value)):null!==t&&vt(this.value)===vt(t)&&this.matchesComparison(Et(t,this.value))}matchesComparison(e){switch(this.op){case"<":return e<0;case"<=":return e<=0;case"==":return 0===e;case"!=":return 0!==e;case">":return e>0;case">=":return e>=0;default:return v()}}isInequality(){return["<","<=",">",">=","!=","not-in"].indexOf(this.op)>=0}getFlattenedFilters(){return[this]}getFilters(){return[this]}}class Ht extends $t{constructor(e,t){super(),this.filters=e,this.op=t,this.ae=null}static create(e,t){return new Ht(e,t)}matches(e){return Wt(this)?void 0===this.filters.find(t=>!t.matches(e)):void 0!==this.filters.find(t=>t.matches(e))}getFlattenedFilters(){return null!==this.ae||(this.ae=this.filters.reduce((e,t)=>e.concat(t.getFlattenedFilters()),[])),this.ae}getFilters(){return Object.assign([],this.filters)}}function Wt(e){return"and"===e.op}function Jt(e){return"or"===e.op}function Yt(e){return Xt(e)&&Wt(e)}function Xt(e){for(const t of e.filters)if(t instanceof Ht)return!1;return!0}function Zt(e){if(e instanceof Qt)return e.field.canonicalString()+e.op.toString()+_t(e.value);if(Yt(e))return e.filters.map(e=>Zt(e)).join(",");{const t=e.filters.map(e=>Zt(e)).join(",");return`${e.op}(${t})`}}function en(e,t){return e instanceof Qt?function(e,t){return t instanceof Qt&&e.op===t.op&&e.field.isEqual(t.field)&&It(e.value,t.value)}(e,t):e instanceof Ht?function(e,t){return t instanceof Ht&&e.op===t.op&&e.filters.length===t.filters.length&&e.filters.reduce((e,n,r)=>e&&en(n,t.filters[r]),!0)}(e,t):void v()}function tn(e,t){const n=e.filters.concat(t);return Ht.create(n,e.op)}function nn(e){return e instanceof Qt?function(e){return`${e.field.canonicalString()} ${e.op} ${_t(e.value)}`}(e):e instanceof Ht?function(e){return e.op.toString()+" {"+e.getFilters().map(nn).join(" ,")+"}"}(e):"Filter"}class rn extends Qt{constructor(e,t,n){super(e,t,n),this.key=K.fromName(n.referenceValue)}matches(e){const t=K.comparator(e.key,this.key);return this.matchesComparison(t)}}class sn extends Qt{constructor(e,t){super(e,"in",t),this.keys=an("in",t)}matches(e){return this.keys.some(t=>t.isEqual(e.key))}}class on extends Qt{constructor(e,t){super(e,"not-in",t),this.keys=an("not-in",t)}matches(e){return!this.keys.some(t=>t.isEqual(e.key))}}function an(e,t){var n;return((null===(n=t.arrayValue)||void 0===n?void 0:n.values)||[]).map(e=>K.fromName(e.referenceValue))}class un extends Qt{constructor(e,t){super(e,"array-contains",t)}matches(e){const t=e.data.field(this.field);return Dt(t)&&bt(t.arrayValue,this.value)}}class cn extends Qt{constructor(e,t){super(e,"in",t)}matches(e){const t=e.data.field(this.field);return null!==t&&bt(this.value.arrayValue,t)}}class ln extends Qt{constructor(e,t){super(e,"not-in",t)}matches(e){if(bt(this.value.arrayValue,{nullValue:"NULL_VALUE"}))return!1;const t=e.data.field(this.field);return null!==t&&!bt(this.value.arrayValue,t)}}class hn extends Qt{constructor(e,t){super(e,"array-contains-any",t)}matches(e){const t=e.data.field(this.field);return!(!Dt(t)||!t.arrayValue.values)&&t.arrayValue.values.some(e=>bt(this.value.arrayValue,e))}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dn{constructor(e,t=null,n=[],r=[],s=null,i=null,o=null){this.path=e,this.collectionGroup=t,this.orderBy=n,this.filters=r,this.limit=s,this.startAt=i,this.endAt=o,this.ue=null}}function fn(e,t=null,n=[],r=[],s=null,i=null,o=null){return new dn(e,t,n,r,s,i,o)}function mn(e){const t=b(e);if(null===t.ue){let e=t.path.canonicalString();null!==t.collectionGroup&&(e+="|cg:"+t.collectionGroup),e+="|f:",e+=t.filters.map(e=>Zt(e)).join(","),e+="|ob:",e+=t.orderBy.map(e=>function(e){return e.field.canonicalString()+e.dir}(e)).join(","),ye(t.limit)||(e+="|l:",e+=t.limit),t.startAt&&(e+="|lb:",e+=t.startAt.inclusive?"b:":"a:",e+=t.startAt.position.map(e=>_t(e)).join(",")),t.endAt&&(e+="|ub:",e+=t.endAt.inclusive?"a:":"b:",e+=t.endAt.position.map(e=>_t(e)).join(",")),t.ue=e}return t.ue}function gn(e,t){if(e.limit!==t.limit)return!1;if(e.orderBy.length!==t.orderBy.length)return!1;for(let n=0;n<e.orderBy.length;n++)if(!jt(e.orderBy[n],t.orderBy[n]))return!1;if(e.filters.length!==t.filters.length)return!1;for(let n=0;n<e.filters.length;n++)if(!en(e.filters[n],t.filters[n]))return!1;return e.collectionGroup===t.collectionGroup&&!!e.path.isEqual(t.path)&&!!Gt(e.startAt,t.startAt)&&Gt(e.endAt,t.endAt)}function pn(e){return K.isDocumentKey(e.path)&&null===e.collectionGroup&&0===e.filters.length}function yn(e,t){return e.filters.filter(e=>e instanceof Qt&&e.field.isEqual(t))}function wn(e,t,n){let r=wt,s=!0;for(const i of yn(e,t)){let e=wt,t=!0;switch(i.op){case"<":case"<=":e=Vt(i.value);break;case"==":case"in":case">=":e=i.value;break;case">":e=i.value,t=!1;break;case"!=":case"not-in":e=wt}Ft({value:r,inclusive:s},{value:e,inclusive:t})<0&&(r=e,s=t)}if(null!==n)for(let i=0;i<e.orderBy.length;++i)if(e.orderBy[i].field.isEqual(t)){const e=n.position[i];Ft({value:r,inclusive:s},{value:e,inclusive:n.inclusive})<0&&(r=e,s=n.inclusive);break}return{value:r,inclusive:s}}function vn(e,t,n){let r=yt,s=!0;for(const i of yn(e,t)){let e=yt,t=!0;switch(i.op){case">=":case">":e=Ot(i.value),t=!1;break;case"==":case"in":case"<=":e=i.value;break;case"<":e=i.value,t=!1;break;case"!=":case"not-in":e=yt}Lt({value:r,inclusive:s},{value:e,inclusive:t})>0&&(r=e,s=t)}if(null!==n)for(let i=0;i<e.orderBy.length;++i)if(e.orderBy[i].field.isEqual(t)){const e=n.position[i];Lt({value:r,inclusive:s},{value:e,inclusive:n.inclusive})>0&&(r=e,s=n.inclusive);break}return{value:r,inclusive:s}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class In{constructor(e,t=null,n=[],r=[],s=null,i="F",o=null,a=null){this.path=e,this.collectionGroup=t,this.explicitOrderBy=n,this.filters=r,this.limit=s,this.limitType=i,this.startAt=o,this.endAt=a,this.ce=null,this.le=null,this.he=null,this.startAt,this.endAt}}function bn(e,t,n,r,s,i,o,a){return new In(e,t,n,r,s,i,o,a)}function En(e){return new In(e)}function Tn(e){return 0===e.filters.length&&null===e.limit&&null==e.startAt&&null==e.endAt&&(0===e.explicitOrderBy.length||1===e.explicitOrderBy.length&&e.explicitOrderBy[0].field.isKeyField())}function _n(e){return null!==e.collectionGroup}function Sn(e){const t=b(e);if(null===t.ce){t.ce=[];const e=new Set;for(const s of t.explicitOrderBy)t.ce.push(s),e.add(s.field.canonicalString());const n=t.explicitOrderBy.length>0?t.explicitOrderBy[t.explicitOrderBy.length-1].dir:"asc",r=function(e){let t=new nt(G.comparator);return e.filters.forEach(e=>{e.getFlattenedFilters().forEach(e=>{e.isInequality()&&(t=t.add(e.field))})}),t}(t);r.forEach(r=>{e.has(r.canonicalString())||r.isKeyField()||t.ce.push(new Kt(r,n))}),e.has(G.keyField().canonicalString())||t.ce.push(new Kt(G.keyField(),n))}return t.ce}function xn(e){const t=b(e);return t.le||(t.le=Cn(t,Sn(e))),t.le}function Cn(e,t){if("F"===e.limitType)return fn(e.path,e.collectionGroup,t,e.filters,e.limit,e.startAt,e.endAt);{t=t.map(e=>{const t="desc"===e.dir?"asc":"desc";return new Kt(e.field,t)});const n=e.endAt?new Bt(e.endAt.position,e.endAt.inclusive):null,r=e.startAt?new Bt(e.startAt.position,e.startAt.inclusive):null;return fn(e.path,e.collectionGroup,t,e.filters,e.limit,n,r)}}function Dn(e,t){const n=e.filters.concat([t]);return new In(e.path,e.collectionGroup,e.explicitOrderBy.slice(),n,e.limit,e.limitType,e.startAt,e.endAt)}function kn(e,t,n){return new In(e.path,e.collectionGroup,e.explicitOrderBy.slice(),e.filters.slice(),t,n,e.startAt,e.endAt)}function Nn(e,t){return gn(xn(e),xn(t))&&e.limitType===t.limitType}function An(e){return`${mn(xn(e))}|lt:${e.limitType}`}function Mn(e){return`Query(target=${function(e){let t=e.path.canonicalString();return null!==e.collectionGroup&&(t+=" collectionGroup="+e.collectionGroup),e.filters.length>0&&(t+=`, filters: [${e.filters.map(e=>nn(e)).join(", ")}]`),ye(e.limit)||(t+=", limit: "+e.limit),e.orderBy.length>0&&(t+=`, orderBy: [${e.orderBy.map(e=>function(e){return`${e.field.canonicalString()} (${e.dir})`}(e)).join(", ")}]`),e.startAt&&(t+=", startAt: ",t+=e.startAt.inclusive?"b:":"a:",t+=e.startAt.position.map(e=>_t(e)).join(",")),e.endAt&&(t+=", endAt: ",t+=e.endAt.inclusive?"a:":"b:",t+=e.endAt.position.map(e=>_t(e)).join(",")),`Target(${t})`}(xn(e))}; limitType=${e.limitType})`}function Rn(e,t){return t.isFoundDocument()&&function(e,t){const n=t.key.path;return null!==e.collectionGroup?t.key.hasCollectionId(e.collectionGroup)&&e.path.isPrefixOf(n):K.isDocumentKey(e.path)?e.path.isEqual(n):e.path.isImmediateParentOf(n)}(e,t)&&function(e,t){for(const n of Sn(e))if(!n.field.isKeyField()&&null===t.data.field(n.field))return!1;return!0}(e,t)&&function(e,t){for(const n of e.filters)if(!n.matches(t))return!1;return!0}(e,t)&&function(e,t){return!(e.startAt&&!function(e,t,n){const r=zt(e,t,n);return e.inclusive?r<=0:r<0}(e.startAt,Sn(e),t))&&!(e.endAt&&!function(e,t,n){const r=zt(e,t,n);return e.inclusive?r>=0:r>0}(e.endAt,Sn(e),t))}(e,t)}function Vn(e){return e.collectionGroup||(e.path.length%2==1?e.path.lastSegment():e.path.get(e.path.length-2))}function On(e){return(t,n)=>{let r=!1;for(const s of Sn(e)){const e=Fn(s,t,n);if(0!==e)return e;r=r||s.field.isKeyField()}return 0}}function Fn(e,t,n){const r=e.field.isKeyField()?K.comparator(t.key,n.key):function(e,t,n){const r=t.data.field(e),s=n.data.field(e);return null!==r&&null!==s?Et(r,s):v()}(e.field,t,n);switch(e.dir){case"asc":return r;case"desc":return-1*r;default:return v()}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ln{constructor(e,t){this.mapKeyFn=e,this.equalsFn=t,this.inner={},this.innerSize=0}get(e){const t=this.mapKeyFn(e),n=this.inner[t];if(void 0!==n)for(const[r,s]of n)if(this.equalsFn(r,e))return s}has(e){return void 0!==this.get(e)}set(e,t){const n=this.mapKeyFn(e),r=this.inner[n];if(void 0===r)return this.inner[n]=[[e,t]],void this.innerSize++;for(let s=0;s<r.length;s++)if(this.equalsFn(r[s][0],e))return void(r[s]=[e,t]);r.push([e,t]),this.innerSize++}delete(e){const t=this.mapKeyFn(e),n=this.inner[t];if(void 0===n)return!1;for(let r=0;r<n.length;r++)if(this.equalsFn(n[r][0],e))return 1===n.length?delete this.inner[t]:n.splice(r,1),this.innerSize--,!0;return!1}forEach(e){Ye(this.inner,(t,n)=>{for(const[r,s]of n)e(r,s)})}isEmpty(){return Xe(this.inner)}size(){return this.innerSize}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Pn=new Ze(K.comparator);function Un(){return Pn}const qn=new Ze(K.comparator);function Bn(...e){let t=qn;for(const n of e)t=t.insert(n.key,n);return t}function zn(e){let t=qn;return e.forEach((e,n)=>t=t.insert(e,n.overlayedDocument)),t}function Gn(){return jn()}function Kn(){return jn()}function jn(){return new Ln(e=>e.toString(),(e,t)=>e.isEqual(t))}const $n=new Ze(K.comparator),Qn=new nt(K.comparator);function Hn(...e){let t=Qn;for(const n of e)t=t.add(n);return t}const Wn=new nt(O);function Jn(){return Wn}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Yn(e,t){if(e.useProto3Json){if(isNaN(t))return{doubleValue:"NaN"};if(t===1/0)return{doubleValue:"Infinity"};if(t===-1/0)return{doubleValue:"-Infinity"}}return{doubleValue:we(t)?"-0":t}}function Xn(e){return{integerValue:""+e}}function Zn(e,t){return ve(t)?Xn(t):Yn(e,t)}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class er{constructor(){this._=void 0}}function tr(e,t,n){return e instanceof sr?function(e,t){const n={fields:{__type__:{stringValue:"server_timestamp"},__local_write_time__:{timestampValue:{seconds:e.seconds,nanos:e.nanoseconds}}}};return t&&dt(t)&&(t=ft(t)),t&&(n.fields.__previous_value__=t),{mapValue:n}}(n,t):e instanceof ir?or(e,t):e instanceof ar?ur(e,t):function(e,t){const n=rr(e,t),r=lr(n)+lr(e.Pe);return Ct(n)&&Ct(e.Pe)?Xn(r):Yn(e.serializer,r)}(e,t)}function nr(e,t,n){return e instanceof ir?or(e,t):e instanceof ar?ur(e,t):n}function rr(e,t){return e instanceof cr?function(e){return Ct(e)||function(e){return!!e&&"doubleValue"in e}(e)}(t)?t:{integerValue:0}:null}class sr extends er{}class ir extends er{constructor(e){super(),this.elements=e}}function or(e,t){const n=hr(t);for(const r of e.elements)n.some(e=>It(e,r))||n.push(r);return{arrayValue:{values:n}}}class ar extends er{constructor(e){super(),this.elements=e}}function ur(e,t){let n=hr(t);for(const r of e.elements)n=n.filter(e=>!It(e,r));return{arrayValue:{values:n}}}class cr extends er{constructor(e,t){super(),this.serializer=e,this.Pe=t}}function lr(e){return lt(e.integerValue||e.doubleValue)}function hr(e){return Dt(e)&&e.arrayValue.values?e.arrayValue.values.slice():[]}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class dr{constructor(e,t){this.field=e,this.transform=t}}function fr(e,t){return e.field.isEqual(t.field)&&function(e,t){return e instanceof ir&&t instanceof ir||e instanceof ar&&t instanceof ar?F(e.elements,t.elements,It):e instanceof cr&&t instanceof cr?It(e.Pe,t.Pe):e instanceof sr&&t instanceof sr}(e.transform,t.transform)}class mr{constructor(e,t){this.version=e,this.transformResults=t}}class gr{constructor(e,t){this.updateTime=e,this.exists=t}static none(){return new gr}static exists(e){return new gr(void 0,e)}static updateTime(e){return new gr(e)}get isNone(){return void 0===this.updateTime&&void 0===this.exists}isEqual(e){return this.exists===e.exists&&(this.updateTime?!!e.updateTime&&this.updateTime.isEqual(e.updateTime):!e.updateTime)}}function pr(e,t){return void 0!==e.updateTime?t.isFoundDocument()&&t.version.isEqual(e.updateTime):void 0===e.exists||e.exists===t.isFoundDocument()}class yr{}function wr(e,t){if(!e.hasLocalMutations||t&&0===t.fields.length)return null;if(null===t)return e.isNoDocument()?new Dr(e.key,gr.none()):new Tr(e.key,e.data,gr.none());{const n=e.data,r=Pt.empty();let s=new nt(G.comparator);for(let e of t.fields)if(!s.has(e)){let t=n.field(e);null===t&&e.length>1&&(e=e.popLast(),t=n.field(e)),null===t?r.delete(e):r.set(e,t),s=s.add(e)}return new _r(e.key,r,new it(s.toArray()),gr.none())}}function vr(e,t,n){e instanceof Tr?function(e,t,n){const r=e.value.clone(),s=xr(e.fieldTransforms,t,n.transformResults);r.setAll(s),t.convertToFoundDocument(n.version,r).setHasCommittedMutations()}(e,t,n):e instanceof _r?function(e,t,n){if(!pr(e.precondition,t))return void t.convertToUnknownDocument(n.version);const r=xr(e.fieldTransforms,t,n.transformResults),s=t.data;s.setAll(Sr(e)),s.setAll(r),t.convertToFoundDocument(n.version,s).setHasCommittedMutations()}(e,t,n):function(e,t,n){t.convertToNoDocument(n.version).setHasCommittedMutations()}(0,t,n)}function Ir(e,t,n,r){return e instanceof Tr?function(e,t,n,r){if(!pr(e.precondition,t))return n;const s=e.value.clone(),i=Cr(e.fieldTransforms,r,t);return s.setAll(i),t.convertToFoundDocument(t.version,s).setHasLocalMutations(),null}(e,t,n,r):e instanceof _r?function(e,t,n,r){if(!pr(e.precondition,t))return n;const s=Cr(e.fieldTransforms,r,t),i=t.data;return i.setAll(Sr(e)),i.setAll(s),t.convertToFoundDocument(t.version,i).setHasLocalMutations(),null===n?null:n.unionWith(e.fieldMask.fields).unionWith(e.fieldTransforms.map(e=>e.field))}(e,t,n,r):function(e,t,n){return pr(e.precondition,t)?(t.convertToNoDocument(t.version).setHasLocalMutations(),null):n}(e,t,n)}function br(e,t){let n=null;for(const r of e.fieldTransforms){const e=t.data.field(r.field),s=rr(r.transform,e||null);null!=s&&(null===n&&(n=Pt.empty()),n.set(r.field,s))}return n||null}function Er(e,t){return e.type===t.type&&!!e.key.isEqual(t.key)&&!!e.precondition.isEqual(t.precondition)&&!!function(e,t){return void 0===e&&void 0===t||!(!e||!t)&&F(e,t,(e,t)=>fr(e,t))}(e.fieldTransforms,t.fieldTransforms)&&(0===e.type?e.value.isEqual(t.value):1!==e.type||e.data.isEqual(t.data)&&e.fieldMask.isEqual(t.fieldMask))}class Tr extends yr{constructor(e,t,n,r=[]){super(),this.key=e,this.value=t,this.precondition=n,this.fieldTransforms=r,this.type=0}getFieldMask(){return null}}class _r extends yr{constructor(e,t,n,r,s=[]){super(),this.key=e,this.data=t,this.fieldMask=n,this.precondition=r,this.fieldTransforms=s,this.type=1}getFieldMask(){return this.fieldMask}}function Sr(e){const t=new Map;return e.fieldMask.fields.forEach(n=>{if(!n.isEmpty()){const r=e.data.field(n);t.set(n,r)}}),t}function xr(e,t,n){const r=new Map;I(e.length===n.length);for(let s=0;s<n.length;s++){const i=e[s],o=i.transform,a=t.data.field(i.field);r.set(i.field,nr(o,a,n[s]))}return r}function Cr(e,t,n){const r=new Map;for(const s of e){const e=s.transform,i=n.data.field(s.field);r.set(s.field,tr(e,i,t))}return r}class Dr extends yr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=2,this.fieldTransforms=[]}getFieldMask(){return null}}class kr extends yr{constructor(e,t){super(),this.key=e,this.precondition=t,this.type=3,this.fieldTransforms=[]}getFieldMask(){return null}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Nr{constructor(e,t,n,r){this.batchId=e,this.localWriteTime=t,this.baseMutations=n,this.mutations=r}applyToRemoteDocument(e,t){const n=t.mutationResults;for(let r=0;r<this.mutations.length;r++){const t=this.mutations[r];t.key.isEqual(e.key)&&vr(t,e,n[r])}}applyToLocalView(e,t){for(const n of this.baseMutations)n.key.isEqual(e.key)&&(t=Ir(n,e,t,this.localWriteTime));for(const n of this.mutations)n.key.isEqual(e.key)&&(t=Ir(n,e,t,this.localWriteTime));return t}applyToLocalDocumentSet(e,t){const n=Kn();return this.mutations.forEach(r=>{const s=e.get(r.key),i=s.overlayedDocument;let o=this.applyToLocalView(i,s.mutatedFields);o=t.has(r.key)?null:o;const a=wr(i,o);null!==a&&n.set(r.key,a),i.isValidDocument()||i.convertToNoDocument(U.min())}),n}keys(){return this.mutations.reduce((e,t)=>e.add(t.key),Hn())}isEqual(e){return this.batchId===e.batchId&&F(this.mutations,e.mutations,(e,t)=>Er(e,t))&&F(this.baseMutations,e.baseMutations,(e,t)=>Er(e,t))}}class Ar{constructor(e,t,n,r){this.batch=e,this.commitVersion=t,this.mutationResults=n,this.docVersions=r}static from(e,t,n){I(e.mutations.length===n.length);let r=function(){return $n}();const s=e.mutations;for(let i=0;i<s.length;i++)r=r.insert(s[i].key,n[i].version);return new Ar(e,t,n,r)}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Mr{constructor(e,t){this.largestBatchId=e,this.mutation=t}getKey(){return this.mutation.key}isEqual(e){return null!==e&&this.mutation===e.mutation}toString(){return`Overlay{\n      largestBatchId: ${this.largestBatchId},\n      mutation: ${this.mutation.toString()}\n    }`}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Rr{constructor(e,t){this.count=e,this.unchangedNames=t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */var Vr,Or;function Fr(e){switch(e){default:return v();case E.CANCELLED:case E.UNKNOWN:case E.DEADLINE_EXCEEDED:case E.RESOURCE_EXHAUSTED:case E.INTERNAL:case E.UNAVAILABLE:case E.UNAUTHENTICATED:return!1;case E.INVALID_ARGUMENT:case E.NOT_FOUND:case E.ALREADY_EXISTS:case E.PERMISSION_DENIED:case E.FAILED_PRECONDITION:case E.ABORTED:case E.OUT_OF_RANGE:case E.UNIMPLEMENTED:case E.DATA_LOSS:return!0}}function Lr(e){if(void 0===e)return p("GRPC error has no .code"),E.UNKNOWN;switch(e){case Vr.OK:return E.OK;case Vr.CANCELLED:return E.CANCELLED;case Vr.UNKNOWN:return E.UNKNOWN;case Vr.DEADLINE_EXCEEDED:return E.DEADLINE_EXCEEDED;case Vr.RESOURCE_EXHAUSTED:return E.RESOURCE_EXHAUSTED;case Vr.INTERNAL:return E.INTERNAL;case Vr.UNAVAILABLE:return E.UNAVAILABLE;case Vr.UNAUTHENTICATED:return E.UNAUTHENTICATED;case Vr.INVALID_ARGUMENT:return E.INVALID_ARGUMENT;case Vr.NOT_FOUND:return E.NOT_FOUND;case Vr.ALREADY_EXISTS:return E.ALREADY_EXISTS;case Vr.PERMISSION_DENIED:return E.PERMISSION_DENIED;case Vr.FAILED_PRECONDITION:return E.FAILED_PRECONDITION;case Vr.ABORTED:return E.ABORTED;case Vr.OUT_OF_RANGE:return E.OUT_OF_RANGE;case Vr.UNIMPLEMENTED:return E.UNIMPLEMENTED;case Vr.DATA_LOSS:return E.DATA_LOSS;default:return v()}}(Or=Vr||(Vr={}))[Or.OK=0]="OK",Or[Or.CANCELLED=1]="CANCELLED",Or[Or.UNKNOWN=2]="UNKNOWN",Or[Or.INVALID_ARGUMENT=3]="INVALID_ARGUMENT",Or[Or.DEADLINE_EXCEEDED=4]="DEADLINE_EXCEEDED",Or[Or.NOT_FOUND=5]="NOT_FOUND",Or[Or.ALREADY_EXISTS=6]="ALREADY_EXISTS",Or[Or.PERMISSION_DENIED=7]="PERMISSION_DENIED",Or[Or.UNAUTHENTICATED=16]="UNAUTHENTICATED",Or[Or.RESOURCE_EXHAUSTED=8]="RESOURCE_EXHAUSTED",Or[Or.FAILED_PRECONDITION=9]="FAILED_PRECONDITION",Or[Or.ABORTED=10]="ABORTED",Or[Or.OUT_OF_RANGE=11]="OUT_OF_RANGE",Or[Or.UNIMPLEMENTED=12]="UNIMPLEMENTED",Or[Or.INTERNAL=13]="INTERNAL",Or[Or.UNAVAILABLE=14]="UNAVAILABLE",Or[Or.DATA_LOSS=15]="DATA_LOSS";
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
let Pr=null;
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ur(){return new TextEncoder}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const qr=new u["a"]([4294967295,4294967295],0);function Br(e){const t=Ur().encode(e),n=new u["b"];return n.update(t),new Uint8Array(n.digest())}function zr(e){const t=new DataView(e.buffer),n=t.getUint32(0,!0),r=t.getUint32(4,!0),s=t.getUint32(8,!0),i=t.getUint32(12,!0);return[new u["a"]([n,r],0),new u["a"]([s,i],0)]}class Gr{constructor(e,t,n){if(this.bitmap=e,this.padding=t,this.hashCount=n,t<0||t>=8)throw new Kr("Invalid padding: "+t);if(n<0)throw new Kr("Invalid hash count: "+n);if(e.length>0&&0===this.hashCount)throw new Kr("Invalid hash count: "+n);if(0===e.length&&0!==t)throw new Kr("Invalid padding when bitmap length is 0: "+t);this.Ie=8*e.length-t,this.Te=u["a"].fromNumber(this.Ie)}Ee(e,t,n){let r=e.add(t.multiply(u["a"].fromNumber(n)));return 1===r.compare(qr)&&(r=new u["a"]([r.getBits(0),r.getBits(1)],0)),r.modulo(this.Te).toNumber()}de(e){return 0!=(this.bitmap[Math.floor(e/8)]&1<<e%8)}mightContain(e){if(0===this.Ie)return!1;const t=Br(e),[n,r]=zr(t);for(let s=0;s<this.hashCount;s++){const e=this.Ee(n,r,s);if(!this.de(e))return!1}return!0}static create(e,t,n){const r=e%8==0?0:8-e%8,s=new Uint8Array(Math.ceil(e/8)),i=new Gr(s,r,t);return n.forEach(e=>i.insert(e)),i}insert(e){if(0===this.Ie)return;const t=Br(e),[n,r]=zr(t);for(let s=0;s<this.hashCount;s++){const e=this.Ee(n,r,s);this.Ae(e)}}Ae(e){const t=Math.floor(e/8),n=e%8;this.bitmap[t]|=1<<n}}class Kr extends Error{constructor(){super(...arguments),this.name="BloomFilterError"}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class jr{constructor(e,t,n,r,s){this.snapshotVersion=e,this.targetChanges=t,this.targetMismatches=n,this.documentUpdates=r,this.resolvedLimboDocuments=s}static createSynthesizedRemoteEventForCurrentChange(e,t,n){const r=new Map;return r.set(e,$r.createSynthesizedTargetChangeForCurrentChange(e,t,n)),new jr(U.min(),r,new Ze(O),Un(),Hn())}}class $r{constructor(e,t,n,r,s){this.resumeToken=e,this.current=t,this.addedDocuments=n,this.modifiedDocuments=r,this.removedDocuments=s}static createSynthesizedTargetChangeForCurrentChange(e,t,n){return new $r(n,t,Hn(),Hn(),Hn())}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Qr{constructor(e,t,n,r){this.Re=e,this.removedTargetIds=t,this.key=n,this.Ve=r}}class Hr{constructor(e,t){this.targetId=e,this.me=t}}class Wr{constructor(e,t,n=at.EMPTY_BYTE_STRING,r=null){this.state=e,this.targetIds=t,this.resumeToken=n,this.cause=r}}class Jr{constructor(){this.fe=0,this.ge=Zr(),this.pe=at.EMPTY_BYTE_STRING,this.ye=!1,this.we=!0}get current(){return this.ye}get resumeToken(){return this.pe}get Se(){return 0!==this.fe}get be(){return this.we}De(e){e.approximateByteSize()>0&&(this.we=!0,this.pe=e)}Ce(){let e=Hn(),t=Hn(),n=Hn();return this.ge.forEach((r,s)=>{switch(s){case 0:e=e.add(r);break;case 2:t=t.add(r);break;case 1:n=n.add(r);break;default:v()}}),new $r(this.pe,this.ye,e,t,n)}ve(){this.we=!1,this.ge=Zr()}Fe(e,t){this.we=!0,this.ge=this.ge.insert(e,t)}Me(e){this.we=!0,this.ge=this.ge.remove(e)}xe(){this.fe+=1}Oe(){this.fe-=1,I(this.fe>=0)}Ne(){this.we=!0,this.ye=!0}}class Yr{constructor(e){this.Le=e,this.Be=new Map,this.ke=Un(),this.qe=Xr(),this.Qe=new Ze(O)}Ke(e){for(const t of e.Re)e.Ve&&e.Ve.isFoundDocument()?this.$e(t,e.Ve):this.Ue(t,e.key,e.Ve);for(const t of e.removedTargetIds)this.Ue(t,e.key,e.Ve)}We(e){this.forEachTarget(e,t=>{const n=this.Ge(t);switch(e.state){case 0:this.ze(t)&&n.De(e.resumeToken);break;case 1:n.Oe(),n.Se||n.ve(),n.De(e.resumeToken);break;case 2:n.Oe(),n.Se||this.removeTarget(t);break;case 3:this.ze(t)&&(n.Ne(),n.De(e.resumeToken));break;case 4:this.ze(t)&&(this.je(t),n.De(e.resumeToken));break;default:v()}})}forEachTarget(e,t){e.targetIds.length>0?e.targetIds.forEach(t):this.Be.forEach((e,n)=>{this.ze(n)&&t(n)})}He(e){const t=e.targetId,n=e.me.count,r=this.Je(t);if(r){const s=r.target;if(pn(s))if(0===n){const e=new K(s.path);this.Ue(t,e,qt.newNoDocument(e,U.min()))}else I(1===n);else{const r=this.Ye(t);if(r!==n){const n=this.Ze(e),s=n?this.Xe(n,e,r):1;if(0!==s){this.je(t);const e=2===s?"TargetPurposeExistenceFilterMismatchBloom":"TargetPurposeExistenceFilterMismatch";this.Qe=this.Qe.insert(t,e)}null==Pr||Pr.et(function(e,t,n,r,s){var i,o,a,u,c,l;const h={localCacheCount:e,existenceFilterCount:t.count,databaseId:n.database,projectId:n.projectId},d=t.unchangedNames;return d&&(h.bloomFilter={applied:0===s,hashCount:null!==(i=null==d?void 0:d.hashCount)&&void 0!==i?i:0,bitmapLength:null!==(u=null===(a=null===(o=null==d?void 0:d.bits)||void 0===o?void 0:o.bitmap)||void 0===a?void 0:a.length)&&void 0!==u?u:0,padding:null!==(l=null===(c=null==d?void 0:d.bits)||void 0===c?void 0:c.padding)&&void 0!==l?l:0,mightContain:e=>{var t;return null!==(t=null==r?void 0:r.mightContain(e))&&void 0!==t&&t}}),h}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(r,e.me,this.Le.tt(),n,s))}}}}Ze(e){const t=e.me.unchangedNames;if(!t||!t.bits)return null;const{bits:{bitmap:n="",padding:r=0},hashCount:s=0}=t;let i,o;try{i=ht(n).toUint8Array()}catch(e){if(e instanceof ot)return y("Decoding the base64 bloom filter in existence filter failed ("+e.message+"); ignoring the bloom filter and falling back to full re-query."),null;throw e}try{o=new Gr(i,r,s)}catch(e){return y(e instanceof Kr?"BloomFilter error: ":"Applying bloom filter failed: ",e),null}return 0===o.Ie?null:o}Xe(e,t,n){return t.me.count===n-this.nt(e,t.targetId)?0:2}nt(e,t){const n=this.Le.getRemoteKeysForTarget(t);let r=0;return n.forEach(n=>{const s=this.Le.tt(),i=`projects/${s.projectId}/databases/${s.database}/documents/${n.path.canonicalString()}`;e.mightContain(i)||(this.Ue(t,n,null),r++)}),r}rt(e){const t=new Map;this.Be.forEach((n,r)=>{const s=this.Je(r);if(s){if(n.current&&pn(s.target)){const t=new K(s.target.path);null!==this.ke.get(t)||this.it(r,t)||this.Ue(r,t,qt.newNoDocument(t,e))}n.be&&(t.set(r,n.Ce()),n.ve())}});let n=Hn();this.qe.forEach((e,t)=>{let r=!0;t.forEachWhile(e=>{const t=this.Je(e);return!t||"TargetPurposeLimboResolution"===t.purpose||(r=!1,!1)}),r&&(n=n.add(e))}),this.ke.forEach((t,n)=>n.setReadTime(e));const r=new jr(e,t,this.Qe,this.ke,n);return this.ke=Un(),this.qe=Xr(),this.Qe=new Ze(O),r}$e(e,t){if(!this.ze(e))return;const n=this.it(e,t.key)?2:0;this.Ge(e).Fe(t.key,n),this.ke=this.ke.insert(t.key,t),this.qe=this.qe.insert(t.key,this.st(t.key).add(e))}Ue(e,t,n){if(!this.ze(e))return;const r=this.Ge(e);this.it(e,t)?r.Fe(t,1):r.Me(t),this.qe=this.qe.insert(t,this.st(t).delete(e)),n&&(this.ke=this.ke.insert(t,n))}removeTarget(e){this.Be.delete(e)}Ye(e){const t=this.Ge(e).Ce();return this.Le.getRemoteKeysForTarget(e).size+t.addedDocuments.size-t.removedDocuments.size}xe(e){this.Ge(e).xe()}Ge(e){let t=this.Be.get(e);return t||(t=new Jr,this.Be.set(e,t)),t}st(e){let t=this.qe.get(e);return t||(t=new nt(O),this.qe=this.qe.insert(e,t)),t}ze(e){const t=null!==this.Je(e);return t||g("WatchChangeAggregator","Detected inactive target",e),t}Je(e){const t=this.Be.get(e);return t&&t.Se?null:this.Le.ot(e)}je(e){this.Be.set(e,new Jr),this.Le.getRemoteKeysForTarget(e).forEach(t=>{this.Ue(e,t,null)})}it(e,t){return this.Le.getRemoteKeysForTarget(e).has(t)}}function Xr(){return new Ze(K.comparator)}function Zr(){return new Ze(K.comparator)}const es=(()=>{const e={asc:"ASCENDING",desc:"DESCENDING"};return e})(),ts=(()=>{const e={"<":"LESS_THAN","<=":"LESS_THAN_OR_EQUAL",">":"GREATER_THAN",">=":"GREATER_THAN_OR_EQUAL","==":"EQUAL","!=":"NOT_EQUAL","array-contains":"ARRAY_CONTAINS",in:"IN","not-in":"NOT_IN","array-contains-any":"ARRAY_CONTAINS_ANY"};return e})(),ns=(()=>{const e={and:"AND",or:"OR"};return e})();class rs{constructor(e,t){this.databaseId=e,this.useProto3Json=t}}function ss(e,t){return e.useProto3Json||ye(t)?t:{value:t}}function is(e,t){return e.useProto3Json?`${new Date(1e3*t.seconds).toISOString().replace(/\.\d*/,"").replace("Z","")}.${("000000000"+t.nanoseconds).slice(-9)}Z`:{seconds:""+t.seconds,nanos:t.nanoseconds}}function os(e,t){return e.useProto3Json?t.toBase64():t.toUint8Array()}function as(e,t){return is(e,t.toTimestamp())}function us(e){return I(!!e),U.fromTimestamp(function(e){const t=ct(e);return new P(t.seconds,t.nanos)}(e))}function cs(e,t){return ls(e,t).canonicalString()}function ls(e,t){const n=function(e){return new B(["projects",e.projectId,"databases",e.database])}(e).child("documents");return void 0===t?n:n.child(t)}function hs(e){const t=B.fromString(e);return I(Fs(t)),t}function ds(e,t){return cs(e.databaseId,t.path)}function fs(e,t){const n=hs(t);if(n.get(1)!==e.databaseId.projectId)throw new T(E.INVALID_ARGUMENT,"Tried to deserialize key from different project: "+n.get(1)+" vs "+e.databaseId.projectId);if(n.get(3)!==e.databaseId.database)throw new T(E.INVALID_ARGUMENT,"Tried to deserialize key from different database: "+n.get(3)+" vs "+e.databaseId.database);return new K(ys(n))}function ms(e,t){return cs(e.databaseId,t)}function gs(e){const t=hs(e);return 4===t.length?B.emptyPath():ys(t)}function ps(e){return new B(["projects",e.databaseId.projectId,"databases",e.databaseId.database]).canonicalString()}function ys(e){return I(e.length>4&&"documents"===e.get(4)),e.popFirst(5)}function ws(e,t,n){return{name:ds(e,t),fields:n.value.mapValue.fields}}function vs(e,t,n){const r=fs(e,t.name),s=us(t.updateTime),i=t.createTime?us(t.createTime):U.min(),o=new Pt({mapValue:{fields:t.fields}}),a=qt.newFoundDocument(r,s,i,o);return n&&a.setHasCommittedMutations(),n?a.setHasCommittedMutations():a}function Is(e,t){let n;if("targetChange"in t){t.targetChange;const s=function(e){return"NO_CHANGE"===e?0:"ADD"===e?1:"REMOVE"===e?2:"CURRENT"===e?3:"RESET"===e?4:v()}(t.targetChange.targetChangeType||"NO_CHANGE"),i=t.targetChange.targetIds||[],o=function(e,t){return e.useProto3Json?(I(void 0===t||"string"==typeof t),at.fromBase64String(t||"")):(I(void 0===t||t instanceof r||t instanceof Uint8Array),at.fromUint8Array(t||new Uint8Array))}(e,t.targetChange.resumeToken),a=t.targetChange.cause,u=a&&function(e){const t=void 0===e.code?E.UNKNOWN:Lr(e.code);return new T(t,e.message||"")}(a);n=new Wr(s,i,o,u||null)}else if("documentChange"in t){t.documentChange;const r=t.documentChange;r.document,r.document.name,r.document.updateTime;const s=fs(e,r.document.name),i=us(r.document.updateTime),o=r.document.createTime?us(r.document.createTime):U.min(),a=new Pt({mapValue:{fields:r.document.fields}}),u=qt.newFoundDocument(s,i,o,a),c=r.targetIds||[],l=r.removedTargetIds||[];n=new Qr(c,l,u.key,u)}else if("documentDelete"in t){t.documentDelete;const r=t.documentDelete;r.document;const s=fs(e,r.document),i=r.readTime?us(r.readTime):U.min(),o=qt.newNoDocument(s,i),a=r.removedTargetIds||[];n=new Qr([],a,o.key,o)}else if("documentRemove"in t){t.documentRemove;const r=t.documentRemove;r.document;const s=fs(e,r.document),i=r.removedTargetIds||[];n=new Qr([],i,s,null)}else{if(!("filter"in t))return v();{t.filter;const e=t.filter;e.targetId;const{count:r=0,unchangedNames:s}=e,i=new Rr(r,s),o=e.targetId;n=new Hr(o,i)}}return n}function bs(e,t){let n;if(t instanceof Tr)n={update:ws(e,t.key,t.value)};else if(t instanceof Dr)n={delete:ds(e,t.key)};else if(t instanceof _r)n={update:ws(e,t.key,t.data),updateMask:Os(t.fieldMask)};else{if(!(t instanceof kr))return v();n={verify:ds(e,t.key)}}return t.fieldTransforms.length>0&&(n.updateTransforms=t.fieldTransforms.map(e=>function(e,t){const n=t.transform;if(n instanceof sr)return{fieldPath:t.field.canonicalString(),setToServerValue:"REQUEST_TIME"};if(n instanceof ir)return{fieldPath:t.field.canonicalString(),appendMissingElements:{values:n.elements}};if(n instanceof ar)return{fieldPath:t.field.canonicalString(),removeAllFromArray:{values:n.elements}};if(n instanceof cr)return{fieldPath:t.field.canonicalString(),increment:n.Pe};throw v()}(0,e))),t.precondition.isNone||(n.currentDocument=function(e,t){return void 0!==t.updateTime?{updateTime:as(e,t.updateTime)}:void 0!==t.exists?{exists:t.exists}:v()}(e,t.precondition)),n}function Es(e,t){const n=t.currentDocument?function(e){return void 0!==e.updateTime?gr.updateTime(us(e.updateTime)):void 0!==e.exists?gr.exists(e.exists):gr.none()}(t.currentDocument):gr.none(),r=t.updateTransforms?t.updateTransforms.map(t=>function(e,t){let n=null;if("setToServerValue"in t)I("REQUEST_TIME"===t.setToServerValue),n=new sr;else if("appendMissingElements"in t){const e=t.appendMissingElements.values||[];n=new ir(e)}else if("removeAllFromArray"in t){const e=t.removeAllFromArray.values||[];n=new ar(e)}else"increment"in t?n=new cr(e,t.increment):v();const r=G.fromServerFormat(t.fieldPath);return new dr(r,n)}(e,t)):[];if(t.update){t.update.name;const s=fs(e,t.update.name),i=new Pt({mapValue:{fields:t.update.fields}});if(t.updateMask){const e=function(e){const t=e.fieldPaths||[];return new it(t.map(e=>G.fromServerFormat(e)))}(t.updateMask);return new _r(s,i,e,n,r)}return new Tr(s,i,n,r)}if(t.delete){const r=fs(e,t.delete);return new Dr(r,n)}if(t.verify){const r=fs(e,t.verify);return new kr(r,n)}return v()}function Ts(e,t){return e&&e.length>0?(I(void 0!==t),e.map(e=>function(e,t){let n=e.updateTime?us(e.updateTime):us(t);return n.isEqual(U.min())&&(n=us(t)),new mr(n,e.transformResults||[])}(e,t))):[]}function _s(e,t){return{documents:[ms(e,t.path)]}}function Ss(e,t){const n={structuredQuery:{}},r=t.path;let s;null!==t.collectionGroup?(s=r,n.structuredQuery.from=[{collectionId:t.collectionGroup,allDescendants:!0}]):(s=r.popLast(),n.structuredQuery.from=[{collectionId:r.lastSegment()}]),n.parent=ms(e,s);const i=function(e){if(0!==e.length)return Vs(Ht.create(e,"and"))}(t.filters);i&&(n.structuredQuery.where=i);const o=function(e){if(0!==e.length)return e.map(e=>function(e){return{field:Ms(e.field),direction:ks(e.dir)}}(e))}(t.orderBy);o&&(n.structuredQuery.orderBy=o);const a=ss(e,t.limit);return null!==a&&(n.structuredQuery.limit=a),t.startAt&&(n.structuredQuery.startAt=function(e){return{before:e.inclusive,values:e.position}}(t.startAt)),t.endAt&&(n.structuredQuery.endAt=function(e){return{before:!e.inclusive,values:e.position}}(t.endAt)),{_t:n,parent:s}}function xs(e){let t=gs(e.parent);const n=e.structuredQuery,r=n.from?n.from.length:0;let s=null;if(r>0){I(1===r);const e=n.from[0];e.allDescendants?s=e.collectionId:t=t.child(e.collectionId)}let i=[];n.where&&(i=function(e){const t=Ds(e);return t instanceof Ht&&Yt(t)?t.getFilters():[t]}(n.where));let o=[];n.orderBy&&(o=function(e){return e.map(e=>function(e){return new Kt(Rs(e.field),function(e){switch(e){case"ASCENDING":return"asc";case"DESCENDING":return"desc";default:return}}(e.direction))}(e))}(n.orderBy));let a=null;n.limit&&(a=function(e){let t;return t="object"==typeof e?e.value:e,ye(t)?null:t}(n.limit));let u=null;n.startAt&&(u=function(e){const t=!!e.before,n=e.values||[];return new Bt(n,t)}(n.startAt));let c=null;return n.endAt&&(c=function(e){const t=!e.before,n=e.values||[];return new Bt(n,t)}(n.endAt)),bn(t,s,o,i,a,"F",u,c)}function Cs(e,t){const n=function(e){switch(e){case"TargetPurposeListen":return null;case"TargetPurposeExistenceFilterMismatch":return"existence-filter-mismatch";case"TargetPurposeExistenceFilterMismatchBloom":return"existence-filter-mismatch-bloom";case"TargetPurposeLimboResolution":return"limbo-document";default:return v()}}(t.purpose);return null==n?null:{"goog-listen-tags":n}}function Ds(e){return void 0!==e.unaryFilter?function(e){switch(e.unaryFilter.op){case"IS_NAN":const t=Rs(e.unaryFilter.field);return Qt.create(t,"==",{doubleValue:NaN});case"IS_NULL":const n=Rs(e.unaryFilter.field);return Qt.create(n,"==",{nullValue:"NULL_VALUE"});case"IS_NOT_NAN":const r=Rs(e.unaryFilter.field);return Qt.create(r,"!=",{doubleValue:NaN});case"IS_NOT_NULL":const s=Rs(e.unaryFilter.field);return Qt.create(s,"!=",{nullValue:"NULL_VALUE"});default:return v()}}(e):void 0!==e.fieldFilter?function(e){return Qt.create(Rs(e.fieldFilter.field),function(e){switch(e){case"EQUAL":return"==";case"NOT_EQUAL":return"!=";case"GREATER_THAN":return">";case"GREATER_THAN_OR_EQUAL":return">=";case"LESS_THAN":return"<";case"LESS_THAN_OR_EQUAL":return"<=";case"ARRAY_CONTAINS":return"array-contains";case"IN":return"in";case"NOT_IN":return"not-in";case"ARRAY_CONTAINS_ANY":return"array-contains-any";default:return v()}}(e.fieldFilter.op),e.fieldFilter.value)}(e):void 0!==e.compositeFilter?function(e){return Ht.create(e.compositeFilter.filters.map(e=>Ds(e)),function(e){switch(e){case"AND":return"and";case"OR":return"or";default:return v()}}(e.compositeFilter.op))}(e):v()}function ks(e){return es[e]}function Ns(e){return ts[e]}function As(e){return ns[e]}function Ms(e){return{fieldPath:e.canonicalString()}}function Rs(e){return G.fromServerFormat(e.fieldPath)}function Vs(e){return e instanceof Qt?function(e){if("=="===e.op){if(Nt(e.value))return{unaryFilter:{field:Ms(e.field),op:"IS_NAN"}};if(kt(e.value))return{unaryFilter:{field:Ms(e.field),op:"IS_NULL"}}}else if("!="===e.op){if(Nt(e.value))return{unaryFilter:{field:Ms(e.field),op:"IS_NOT_NAN"}};if(kt(e.value))return{unaryFilter:{field:Ms(e.field),op:"IS_NOT_NULL"}}}return{fieldFilter:{field:Ms(e.field),op:Ns(e.op),value:e.value}}}(e):e instanceof Ht?function(e){const t=e.getFilters().map(e=>Vs(e));return 1===t.length?t[0]:{compositeFilter:{op:As(e.op),filters:t}}}(e):v()}function Os(e){const t=[];return e.fields.forEach(e=>t.push(e.canonicalString())),{fieldPaths:t}}function Fs(e){return e.length>=4&&"projects"===e.get(0)&&"databases"===e.get(2)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ls{constructor(e,t,n,r,s=U.min(),i=U.min(),o=at.EMPTY_BYTE_STRING,a=null){this.target=e,this.targetId=t,this.purpose=n,this.sequenceNumber=r,this.snapshotVersion=s,this.lastLimboFreeSnapshotVersion=i,this.resumeToken=o,this.expectedCount=a}withSequenceNumber(e){return new Ls(this.target,this.targetId,this.purpose,e,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,this.expectedCount)}withResumeToken(e,t){return new Ls(this.target,this.targetId,this.purpose,this.sequenceNumber,t,this.lastLimboFreeSnapshotVersion,e,null)}withExpectedCount(e){return new Ls(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,this.lastLimboFreeSnapshotVersion,this.resumeToken,e)}withLastLimboFreeSnapshotVersion(e){return new Ls(this.target,this.targetId,this.purpose,this.sequenceNumber,this.snapshotVersion,e,this.resumeToken,this.expectedCount)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ps{constructor(e){this.ct=e}}function Us(e,t){let n;if(t.document)n=vs(e.ct,t.document,!!t.hasCommittedMutations);else if(t.noDocument){const e=K.fromSegments(t.noDocument.path),r=Gs(t.noDocument.readTime);n=qt.newNoDocument(e,r),t.hasCommittedMutations&&n.setHasCommittedMutations()}else{if(!t.unknownDocument)return v();{const e=K.fromSegments(t.unknownDocument.path),r=Gs(t.unknownDocument.version);n=qt.newUnknownDocument(e,r)}}return t.readTime&&n.setReadTime(function(e){const t=new P(e[0],e[1]);return U.fromTimestamp(t)}(t.readTime)),n}function qs(e,t){const n=t.key,r={prefixPath:n.getCollectionPath().popLast().toArray(),collectionGroup:n.collectionGroup,documentId:n.path.lastSegment(),readTime:Bs(t.readTime),hasCommittedMutations:t.hasCommittedMutations};if(t.isFoundDocument())r.document=function(e,t){return{name:ds(e,t.key),fields:t.data.value.mapValue.fields,updateTime:is(e,t.version.toTimestamp()),createTime:is(e,t.createTime.toTimestamp())}}(e.ct,t);else if(t.isNoDocument())r.noDocument={path:n.path.toArray(),readTime:zs(t.version)};else{if(!t.isUnknownDocument())return v();r.unknownDocument={path:n.path.toArray(),version:zs(t.version)}}return r}function Bs(e){const t=e.toTimestamp();return[t.seconds,t.nanoseconds]}function zs(e){const t=e.toTimestamp();return{seconds:t.seconds,nanoseconds:t.nanoseconds}}function Gs(e){const t=new P(e.seconds,e.nanoseconds);return U.fromTimestamp(t)}function Ks(e,t){const n=(t.baseMutations||[]).map(t=>Es(e.ct,t));for(let i=0;i<t.mutations.length-1;++i){const e=t.mutations[i];if(i+1<t.mutations.length&&void 0!==t.mutations[i+1].transform){const n=t.mutations[i+1];e.updateTransforms=n.transform.fieldTransforms,t.mutations.splice(i+1,1),++i}}const r=t.mutations.map(t=>Es(e.ct,t)),s=P.fromMillis(t.localWriteTimeMs);return new Nr(t.batchId,s,n,r)}function js(e){const t=Gs(e.readTime),n=void 0!==e.lastLimboFreeSnapshotVersion?Gs(e.lastLimboFreeSnapshotVersion):U.min();let r;return r=function(e){return void 0!==e.documents}(e.query)?function(e){return I(1===e.documents.length),xn(En(gs(e.documents[0])))}(e.query):function(e){return xn(xs(e))}(e.query),new Ls(r,e.targetId,"TargetPurposeListen",e.lastListenSequenceNumber,t,n,at.fromBase64String(e.resumeToken))}function $s(e,t){const n=zs(t.snapshotVersion),r=zs(t.lastLimboFreeSnapshotVersion);let s;s=pn(t.target)?_s(e.ct,t.target):Ss(e.ct,t.target)._t;const i=t.resumeToken.toBase64();return{targetId:t.targetId,canonicalId:mn(t.target),readTime:n,resumeToken:i,lastListenSequenceNumber:t.sequenceNumber,lastLimboFreeSnapshotVersion:r,query:s}}function Qs(e){const t=xs({parent:e.parent,structuredQuery:e.structuredQuery});return"LAST"===e.limitType?kn(t,t.limit,"L"):t}function Hs(e,t){return new Mr(t.largestBatchId,Es(e.ct,t.overlayMutation))}function Ws(e,t){const n=t.path.lastSegment();return[e,Ie(t.path.popLast()),n]}function Js(e,t,n,r){return{indexId:e,uid:t,sequenceNumber:n,readTime:zs(r.readTime),documentKey:Ie(r.documentKey.path),largestBatchId:r.largestBatchId}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ys{getBundleMetadata(e,t){return Xs(e).get(t).next(e=>{if(e)return function(e){return{id:e.bundleId,createTime:Gs(e.createTime),version:e.version}}(e)})}saveBundleMetadata(e,t){return Xs(e).put(function(e){return{bundleId:e.id,createTime:zs(us(e.createTime)),version:e.version}}(t))}getNamedQuery(e,t){return Zs(e).get(t).next(e=>{if(e)return function(e){return{name:e.name,query:Qs(e.bundledQuery),readTime:Gs(e.readTime)}}(e)})}saveNamedQuery(e,t){return Zs(e).put(function(e){return{name:e.name,readTime:zs(us(e.readTime)),bundledQuery:e.bundledQuery}}(t))}}function Xs(e){return We(e,"bundles")}function Zs(e){return We(e,"namedQueries")}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ei{constructor(e,t){this.serializer=e,this.userId=t}static lt(e,t){const n=t.uid||"";return new ei(e,n)}getOverlay(e,t){return ti(e).get(Ws(this.userId,t)).next(e=>e?Hs(this.serializer,e):null)}getOverlays(e,t){const n=Gn();return re.forEach(t,t=>this.getOverlay(e,t).next(e=>{null!==e&&n.set(t,e)})).next(()=>n)}saveOverlays(e,t,n){const r=[];return n.forEach((n,s)=>{const i=new Mr(t,s);r.push(this.ht(e,i))}),re.waitFor(r)}removeOverlaysForBatchId(e,t,n){const r=new Set;t.forEach(e=>r.add(Ie(e.getCollectionPath())));const s=[];return r.forEach(t=>{const r=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,n+1],!1,!0);s.push(ti(e).j("collectionPathOverlayIndex",r))}),re.waitFor(s)}getOverlaysForCollection(e,t,n){const r=Gn(),s=Ie(t),i=IDBKeyRange.bound([this.userId,s,n],[this.userId,s,Number.POSITIVE_INFINITY],!0);return ti(e).U("collectionPathOverlayIndex",i).next(e=>{for(const t of e){const e=Hs(this.serializer,t);r.set(e.getKey(),e)}return r})}getOverlaysForCollectionGroup(e,t,n,r){const s=Gn();let i;const o=IDBKeyRange.bound([this.userId,t,n],[this.userId,t,Number.POSITIVE_INFINITY],!0);return ti(e).J({index:"collectionGroupOverlayIndex",range:o},(e,t,n)=>{const o=Hs(this.serializer,t);s.size()<r||o.largestBatchId===i?(s.set(o.getKey(),o),i=o.largestBatchId):n.done()}).next(()=>s)}ht(e,t){return ti(e).put(function(e,t,n){const[r,s,i]=Ws(t,n.mutation.key);return{userId:t,collectionPath:s,documentId:i,collectionGroup:n.mutation.key.getCollectionGroup(),largestBatchId:n.largestBatchId,overlayMutation:bs(e.ct,n.mutation)}}(this.serializer,this.userId,t))}}function ti(e){return We(e,"documentOverlays")}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ni{constructor(){}Pt(e,t){this.It(e,t),t.Tt()}It(e,t){if("nullValue"in e)this.Et(t,5);else if("booleanValue"in e)this.Et(t,10),t.dt(e.booleanValue?1:0);else if("integerValue"in e)this.Et(t,15),t.dt(lt(e.integerValue));else if("doubleValue"in e){const n=lt(e.doubleValue);isNaN(n)?this.Et(t,13):(this.Et(t,15),we(n)?t.dt(0):t.dt(n))}else if("timestampValue"in e){let n=e.timestampValue;this.Et(t,20),"string"==typeof n&&(n=ct(n)),t.At(""+(n.seconds||"")),t.dt(n.nanos||0)}else if("stringValue"in e)this.Rt(e.stringValue,t),this.Vt(t);else if("bytesValue"in e)this.Et(t,30),t.ft(ht(e.bytesValue)),this.Vt(t);else if("referenceValue"in e)this.gt(e.referenceValue,t);else if("geoPointValue"in e){const n=e.geoPointValue;this.Et(t,45),t.dt(n.latitude||0),t.dt(n.longitude||0)}else"mapValue"in e?Rt(e)?this.Et(t,Number.MAX_SAFE_INTEGER):(this.yt(e.mapValue,t),this.Vt(t)):"arrayValue"in e?(this.wt(e.arrayValue,t),this.Vt(t)):v()}Rt(e,t){this.Et(t,25),this.St(e,t)}St(e,t){t.At(e)}yt(e,t){const n=e.fields||{};this.Et(t,55);for(const r of Object.keys(n))this.Rt(r,t),this.It(n[r],t)}wt(e,t){const n=e.values||[];this.Et(t,50);for(const r of n)this.It(r,t)}gt(e,t){this.Et(t,37),K.fromName(e).path.forEach(e=>{this.Et(t,60),this.St(e,t)})}Et(e,t){e.dt(t)}Vt(e){e.dt(2)}}function ri(e){if(0===e)return 8;let t=0;return e>>4==0&&(t+=4,e<<=4),e>>6==0&&(t+=2,e<<=2),e>>7==0&&(t+=1),t}function si(e){const t=64-function(e){let t=0;for(let n=0;n<8;++n){const r=ri(255&e[n]);if(t+=r,8!==r)break}return t}(e);return Math.ceil(t/8)}ni.bt=new ni;class ii{constructor(){this.buffer=new Uint8Array(1024),this.position=0}Dt(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Ct(n.value),n=t.next();this.vt()}Ft(e){const t=e[Symbol.iterator]();let n=t.next();for(;!n.done;)this.Mt(n.value),n=t.next();this.xt()}Ot(e){for(const t of e){const e=t.charCodeAt(0);if(e<128)this.Ct(e);else if(e<2048)this.Ct(960|e>>>6),this.Ct(128|63&e);else if(t<"\ud800"||"\udbff"<t)this.Ct(480|e>>>12),this.Ct(128|63&e>>>6),this.Ct(128|63&e);else{const e=t.codePointAt(0);this.Ct(240|e>>>18),this.Ct(128|63&e>>>12),this.Ct(128|63&e>>>6),this.Ct(128|63&e)}}this.vt()}Nt(e){for(const t of e){const e=t.charCodeAt(0);if(e<128)this.Mt(e);else if(e<2048)this.Mt(960|e>>>6),this.Mt(128|63&e);else if(t<"\ud800"||"\udbff"<t)this.Mt(480|e>>>12),this.Mt(128|63&e>>>6),this.Mt(128|63&e);else{const e=t.codePointAt(0);this.Mt(240|e>>>18),this.Mt(128|63&e>>>12),this.Mt(128|63&e>>>6),this.Mt(128|63&e)}}this.xt()}Lt(e){const t=this.Bt(e),n=si(t);this.kt(1+n),this.buffer[this.position++]=255&n;for(let r=t.length-n;r<t.length;++r)this.buffer[this.position++]=255&t[r]}qt(e){const t=this.Bt(e),n=si(t);this.kt(1+n),this.buffer[this.position++]=~(255&n);for(let r=t.length-n;r<t.length;++r)this.buffer[this.position++]=~(255&t[r])}Qt(){this.Kt(255),this.Kt(255)}$t(){this.Ut(255),this.Ut(255)}reset(){this.position=0}seed(e){this.kt(e.length),this.buffer.set(e,this.position),this.position+=e.length}Wt(){return this.buffer.slice(0,this.position)}Bt(e){const t=function(e){const t=new DataView(new ArrayBuffer(8));return t.setFloat64(0,e,!1),new Uint8Array(t.buffer)}(e),n=0!=(128&t[0]);t[0]^=n?255:128;for(let r=1;r<t.length;++r)t[r]^=n?255:0;return t}Ct(e){const t=255&e;0===t?(this.Kt(0),this.Kt(255)):255===t?(this.Kt(255),this.Kt(0)):this.Kt(t)}Mt(e){const t=255&e;0===t?(this.Ut(0),this.Ut(255)):255===t?(this.Ut(255),this.Ut(0)):this.Ut(e)}vt(){this.Kt(0),this.Kt(1)}xt(){this.Ut(0),this.Ut(1)}Kt(e){this.kt(1),this.buffer[this.position++]=e}Ut(e){this.kt(1),this.buffer[this.position++]=~e}kt(e){const t=e+this.position;if(t<=this.buffer.length)return;let n=2*this.buffer.length;n<t&&(n=t);const r=new Uint8Array(n);r.set(this.buffer),this.buffer=r}}class oi{constructor(e){this.Gt=e}ft(e){this.Gt.Dt(e)}At(e){this.Gt.Ot(e)}dt(e){this.Gt.Lt(e)}Tt(){this.Gt.Qt()}}class ai{constructor(e){this.Gt=e}ft(e){this.Gt.Ft(e)}At(e){this.Gt.Nt(e)}dt(e){this.Gt.qt(e)}Tt(){this.Gt.$t()}}class ui{constructor(){this.Gt=new ii,this.zt=new oi(this.Gt),this.jt=new ai(this.Gt)}seed(e){this.Gt.seed(e)}Ht(e){return 0===e?this.zt:this.jt}Wt(){return this.Gt.Wt()}reset(){this.Gt.reset()}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ci{constructor(e,t,n,r){this.indexId=e,this.documentKey=t,this.arrayValue=n,this.directionalValue=r}Jt(){const e=this.directionalValue.length,t=0===e||255===this.directionalValue[e-1]?e+1:e,n=new Uint8Array(t);return n.set(this.directionalValue,0),t!==e?n.set([0],this.directionalValue.length):++n[n.length-1],new ci(this.indexId,this.documentKey,this.arrayValue,n)}}function li(e,t){let n=e.indexId-t.indexId;return 0!==n?n:(n=hi(e.arrayValue,t.arrayValue),0!==n?n:(n=hi(e.directionalValue,t.directionalValue),0!==n?n:K.comparator(e.documentKey,t.documentKey)))}function hi(e,t){for(let n=0;n<e.length&&n<t.length;++n){const r=e[n]-t[n];if(0!==r)return r}return e.length-t.length}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class di{constructor(e){this.Yt=new nt((e,t)=>G.comparator(e.field,t.field)),this.collectionId=null!=e.collectionGroup?e.collectionGroup:e.path.lastSegment(),this.Zt=e.orderBy,this.Xt=[];for(const t of e.filters){const e=t;e.isInequality()?this.Yt=this.Yt.add(e):this.Xt.push(e)}}get en(){return this.Yt.size>1}tn(e){if(I(e.collectionGroup===this.collectionId),this.en)return!1;const t=$(e);if(void 0!==t&&!this.nn(t))return!1;const n=Q(e);let r=new Set,s=0,i=0;for(;s<n.length&&this.nn(n[s]);++s)r=r.add(n[s].fieldPath.canonicalString());if(s===n.length)return!0;if(this.Yt.size>0){const e=this.Yt.getIterator().getNext();if(!r.has(e.field.canonicalString())){const t=n[s];if(!this.rn(e,t)||!this.sn(this.Zt[i++],t))return!1}++s}for(;s<n.length;++s){const e=n[s];if(i>=this.Zt.length||!this.sn(this.Zt[i++],e))return!1}return!0}on(){if(this.en)return null;let e=new nt(G.comparator);const t=[];for(const n of this.Xt)if(!n.field.isKeyField())if("array-contains"===n.op||"array-contains-any"===n.op)t.push(new H(n.field,2));else{if(e.has(n.field))continue;e=e.add(n.field),t.push(new H(n.field,0))}for(const n of this.Zt)n.field.isKeyField()||e.has(n.field)||(e=e.add(n.field),t.push(new H(n.field,"asc"===n.dir?0:1)));return new j(j.UNKNOWN_ID,this.collectionId,t,W.empty())}nn(e){for(const t of this.Xt)if(this.rn(t,e))return!0;return!1}rn(e,t){if(void 0===e||!e.field.isEqual(t.fieldPath))return!1;const n="array-contains"===e.op||"array-contains-any"===e.op;return 2===t.kind===n}sn(e,t){return!!e.field.isEqual(t.fieldPath)&&(0===t.kind&&"asc"===e.dir||1===t.kind&&"desc"===e.dir)}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function fi(e){var t,n;if(I(e instanceof Qt||e instanceof Ht),e instanceof Qt){if(e instanceof cn){const r=(null===(n=null===(t=e.value.arrayValue)||void 0===t?void 0:t.values)||void 0===n?void 0:n.map(t=>Qt.create(e.field,"==",t)))||[];return Ht.create(r,"or")}return e}const r=e.filters.map(e=>fi(e));return Ht.create(r,e.op)}function mi(e){if(0===e.getFilters().length)return[];const t=wi(fi(e));return I(yi(t)),gi(t)||pi(t)?[t]:t.getFilters()}function gi(e){return e instanceof Qt}function pi(e){return e instanceof Ht&&Yt(e)}function yi(e){return gi(e)||pi(e)||function(e){if(e instanceof Ht&&Jt(e)){for(const t of e.getFilters())if(!gi(t)&&!pi(t))return!1;return!0}return!1}(e)}function wi(e){if(I(e instanceof Qt||e instanceof Ht),e instanceof Qt)return e;if(1===e.filters.length)return wi(e.filters[0]);const t=e.filters.map(e=>wi(e));let n=Ht.create(t,e.op);return n=bi(n),yi(n)?n:(I(n instanceof Ht),I(Wt(n)),I(n.filters.length>1),n.filters.reduce((e,t)=>vi(e,t)))}function vi(e,t){let n;return I(e instanceof Qt||e instanceof Ht),I(t instanceof Qt||t instanceof Ht),n=e instanceof Qt?t instanceof Qt?function(e,t){return Ht.create([e,t],"and")}(e,t):Ii(e,t):t instanceof Qt?Ii(t,e):function(e,t){if(I(e.filters.length>0&&t.filters.length>0),Wt(e)&&Wt(t))return tn(e,t.getFilters());const n=Jt(e)?e:t,r=Jt(e)?t:e,s=n.filters.map(e=>vi(e,r));return Ht.create(s,"or")}(e,t),bi(n)}function Ii(e,t){if(Wt(t))return tn(t,e.getFilters());{const n=t.filters.map(t=>vi(e,t));return Ht.create(n,"or")}}function bi(e){if(I(e instanceof Qt||e instanceof Ht),e instanceof Qt)return e;const t=e.getFilters();if(1===t.length)return bi(t[0]);if(Xt(e))return e;const n=t.map(e=>bi(e)),r=[];return n.forEach(t=>{t instanceof Qt?r.push(t):t instanceof Ht&&(t.op===e.op?r.push(...t.filters):r.push(t))}),1===r.length?r[0]:Ht.create(r,e.op)
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class Ei{constructor(){this._n=new Ti}addToCollectionParentIndex(e,t){return this._n.add(t),re.resolve()}getCollectionParents(e,t){return re.resolve(this._n.getEntries(t))}addFieldIndex(e,t){return re.resolve()}deleteFieldIndex(e,t){return re.resolve()}deleteAllFieldIndexes(e){return re.resolve()}createTargetIndexes(e,t){return re.resolve()}getDocumentsMatchingTarget(e,t){return re.resolve(null)}getIndexType(e,t){return re.resolve(0)}getFieldIndexes(e,t){return re.resolve([])}getNextCollectionGroupToUpdate(e){return re.resolve(null)}getMinOffset(e,t){return re.resolve(X.min())}getMinOffsetFromCollectionGroup(e,t){return re.resolve(X.min())}updateCollectionGroup(e,t,n){return re.resolve()}updateIndexEntries(e,t){return re.resolve()}}class Ti{constructor(){this.index={}}add(e){const t=e.lastSegment(),n=e.popLast(),r=this.index[t]||new nt(B.comparator),s=!r.has(n);return this.index[t]=r.add(n),s}has(e){const t=e.lastSegment(),n=e.popLast(),r=this.index[t];return r&&r.has(n)}getEntries(e){return(this.index[e]||new nt(B.comparator)).toArray()}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const _i=new Uint8Array(0);class Si{constructor(e,t){this.databaseId=t,this.an=new Ti,this.un=new Ln(e=>mn(e),(e,t)=>gn(e,t)),this.uid=e.uid||""}addToCollectionParentIndex(e,t){if(!this.an.has(t)){const n=t.lastSegment(),r=t.popLast();e.addOnCommittedListener(()=>{this.an.add(t)});const s={collectionId:n,parent:Ie(r)};return xi(e).put(s)}return re.resolve()}getCollectionParents(e,t){const n=[],r=IDBKeyRange.bound([t,""],[L(t),""],!1,!0);return xi(e).U(r).next(e=>{for(const r of e){if(r.collectionId!==t)break;n.push(Te(r.parent))}return n})}addFieldIndex(e,t){const n=Di(e),r=function(e){return{indexId:e.indexId,collectionGroup:e.collectionGroup,fields:e.fields.map(e=>[e.fieldPath.canonicalString(),e.kind])}}(t);delete r.indexId;const s=n.add(r);if(t.indexState){const n=ki(e);return s.next(e=>{n.put(Js(e,this.uid,t.indexState.sequenceNumber,t.indexState.offset))})}return s.next()}deleteFieldIndex(e,t){const n=Di(e),r=ki(e),s=Ci(e);return n.delete(t.indexId).next(()=>r.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0))).next(()=>s.delete(IDBKeyRange.bound([t.indexId],[t.indexId+1],!1,!0)))}deleteAllFieldIndexes(e){const t=Di(e),n=Ci(e),r=ki(e);return t.j().next(()=>n.j()).next(()=>r.j())}createTargetIndexes(e,t){return re.forEach(this.cn(t),t=>this.getIndexType(e,t).next(n=>{if(0===n||1===n){const n=new di(t).on();if(null!=n)return this.addFieldIndex(e,n)}}))}getDocumentsMatchingTarget(e,t){const n=Ci(e);let r=!0;const s=new Map;return re.forEach(this.cn(t),t=>this.ln(e,t).next(e=>{r&&(r=!!e),s.set(t,e)})).next(()=>{if(r){let e=Hn();const r=[];return re.forEach(s,(s,i)=>{g("IndexedDbIndexManager",`Using index ${function(e){return`id=${e.indexId}|cg=${e.collectionGroup}|f=${e.fields.map(e=>`${e.fieldPath}:${e.kind}`).join(",")}`}(s)} to execute ${mn(t)}`);const o=function(e,t){const n=$(t);if(void 0===n)return null;for(const r of yn(e,n.fieldPath))switch(r.op){case"array-contains-any":return r.value.arrayValue.values||[];case"array-contains":return[r.value]}return null}(i,s),a=function(e,t){const n=new Map;for(const r of Q(t))for(const t of yn(e,r.fieldPath))switch(t.op){case"==":case"in":n.set(r.fieldPath.canonicalString(),t.value);break;case"not-in":case"!=":return n.set(r.fieldPath.canonicalString(),t.value),Array.from(n.values())}return null}(i,s),u=function(e,t){const n=[];let r=!0;for(const s of Q(t)){const t=0===s.kind?wn(e,s.fieldPath,e.startAt):vn(e,s.fieldPath,e.startAt);n.push(t.value),r&&(r=t.inclusive)}return new Bt(n,r)}(i,s),c=function(e,t){const n=[];let r=!0;for(const s of Q(t)){const t=0===s.kind?vn(e,s.fieldPath,e.endAt):wn(e,s.fieldPath,e.endAt);n.push(t.value),r&&(r=t.inclusive)}return new Bt(n,r)}(i,s),l=this.hn(s,i,u),h=this.hn(s,i,c),d=this.Pn(s,i,a),f=this.In(s.indexId,o,l,u.inclusive,h,c.inclusive,d);return re.forEach(f,s=>n.G(s,t.limit).next(t=>{t.forEach(t=>{const n=K.fromSegments(t.documentKey);e.has(n)||(e=e.add(n),r.push(n))})}))}).next(()=>r)}return re.resolve(null)})}cn(e){let t=this.un.get(e);return t||(t=0===e.filters.length?[e]:mi(Ht.create(e.filters,"and")).map(t=>fn(e.path,e.collectionGroup,e.orderBy,t.getFilters(),e.limit,e.startAt,e.endAt)),this.un.set(e,t),t)}In(e,t,n,r,s,i,o){const a=(null!=t?t.length:1)*Math.max(n.length,s.length),u=a/(null!=t?t.length:1),c=[];for(let l=0;l<a;++l){const a=t?this.Tn(t[l/u]):_i,h=this.En(e,a,n[l%u],r),d=this.dn(e,a,s[l%u],i),f=o.map(t=>this.En(e,a,t,!0));c.push(...this.createRange(h,d,f))}return c}En(e,t,n,r){const s=new ci(e,K.empty(),t,n);return r?s:s.Jt()}dn(e,t,n,r){const s=new ci(e,K.empty(),t,n);return r?s.Jt():s}ln(e,t){const n=new di(t),r=null!=t.collectionGroup?t.collectionGroup:t.path.lastSegment();return this.getFieldIndexes(e,r).next(e=>{let t=null;for(const r of e)n.tn(r)&&(!t||r.fields.length>t.fields.length)&&(t=r);return t})}getIndexType(e,t){let n=2;const r=this.cn(t);return re.forEach(r,t=>this.ln(e,t).next(e=>{e?0!==n&&e.fields.length<function(e){let t=new nt(G.comparator),n=!1;for(const r of e.filters)for(const e of r.getFlattenedFilters())e.field.isKeyField()||("array-contains"===e.op||"array-contains-any"===e.op?n=!0:t=t.add(e.field));for(const r of e.orderBy)r.field.isKeyField()||(t=t.add(r.field));return t.size+(n?1:0)}(t)&&(n=1):n=0})).next(()=>function(e){return null!==e.limit}(t)&&r.length>1&&2===n?1:n)}An(e,t){const n=new ui;for(const r of Q(e)){const e=t.data.field(r.fieldPath);if(null==e)return null;const s=n.Ht(r.kind);ni.bt.Pt(e,s)}return n.Wt()}Tn(e){const t=new ui;return ni.bt.Pt(e,t.Ht(0)),t.Wt()}Rn(e,t){const n=new ui;return ni.bt.Pt(xt(this.databaseId,t),n.Ht(function(e){const t=Q(e);return 0===t.length?0:t[t.length-1].kind}(e))),n.Wt()}Pn(e,t,n){if(null===n)return[];let r=[];r.push(new ui);let s=0;for(const i of Q(e)){const e=n[s++];for(const n of r)if(this.Vn(t,i.fieldPath)&&Dt(e))r=this.mn(r,i,e);else{const t=n.Ht(i.kind);ni.bt.Pt(e,t)}}return this.fn(r)}hn(e,t,n){return this.Pn(e,t,n.position)}fn(e){const t=[];for(let n=0;n<e.length;++n)t[n]=e[n].Wt();return t}mn(e,t,n){const r=[...e],s=[];for(const i of n.arrayValue.values||[])for(const e of r){const n=new ui;n.seed(e.Wt()),ni.bt.Pt(i,n.Ht(t.kind)),s.push(n)}return s}Vn(e,t){return!!e.filters.find(e=>e instanceof Qt&&e.field.isEqual(t)&&("in"===e.op||"not-in"===e.op))}getFieldIndexes(e,t){const n=Di(e),r=ki(e);return(t?n.U("collectionGroupIndex",IDBKeyRange.bound(t,t)):n.U()).next(e=>{const t=[];return re.forEach(e,e=>r.get([e.indexId,this.uid]).next(n=>{t.push(function(e,t){const n=t?new W(t.sequenceNumber,new X(Gs(t.readTime),new K(Te(t.documentKey)),t.largestBatchId)):W.empty(),r=e.fields.map(([e,t])=>new H(G.fromServerFormat(e),t));return new j(e.indexId,e.collectionGroup,r,n)}(e,n))})).next(()=>t)})}getNextCollectionGroupToUpdate(e){return this.getFieldIndexes(e).next(e=>0===e.length?null:(e.sort((e,t)=>{const n=e.indexState.sequenceNumber-t.indexState.sequenceNumber;return 0!==n?n:O(e.collectionGroup,t.collectionGroup)}),e[0].collectionGroup))}updateCollectionGroup(e,t,n){const r=Di(e),s=ki(e);return this.gn(e).next(e=>r.U("collectionGroupIndex",IDBKeyRange.bound(t,t)).next(t=>re.forEach(t,t=>s.put(Js(t.indexId,this.uid,e,n)))))}updateIndexEntries(e,t){const n=new Map;return re.forEach(t,(t,r)=>{const s=n.get(t.collectionGroup);return(s?re.resolve(s):this.getFieldIndexes(e,t.collectionGroup)).next(s=>(n.set(t.collectionGroup,s),re.forEach(s,n=>this.pn(e,t,n).next(t=>{const s=this.yn(r,n);return t.isEqual(s)?re.resolve():this.wn(e,r,n,t,s)}))))})}Sn(e,t,n,r){return Ci(e).put({indexId:r.indexId,uid:this.uid,arrayValue:r.arrayValue,directionalValue:r.directionalValue,orderedDocumentKey:this.Rn(n,t.key),documentKey:t.key.path.toArray()})}bn(e,t,n,r){return Ci(e).delete([r.indexId,this.uid,r.arrayValue,r.directionalValue,this.Rn(n,t.key),t.key.path.toArray()])}pn(e,t,n){const r=Ci(e);let s=new nt(li);return r.J({index:"documentKeyIndex",range:IDBKeyRange.only([n.indexId,this.uid,this.Rn(n,t)])},(e,r)=>{s=s.add(new ci(n.indexId,t,r.arrayValue,r.directionalValue))}).next(()=>s)}yn(e,t){let n=new nt(li);const r=this.An(t,e);if(null==r)return n;const s=$(t);if(null!=s){const i=e.data.field(s.fieldPath);if(Dt(i))for(const s of i.arrayValue.values||[])n=n.add(new ci(t.indexId,e.key,this.Tn(s),r))}else n=n.add(new ci(t.indexId,e.key,_i,r));return n}wn(e,t,n,r,s){g("IndexedDbIndexManager","Updating index entries for document '%s'",t.key);const i=[];return function(e,t,n,r,s){const i=e.getIterator(),o=t.getIterator();let a=st(i),u=st(o);for(;a||u;){let e=!1,t=!1;if(a&&u){const r=n(a,u);r<0?t=!0:r>0&&(e=!0)}else null!=a?t=!0:e=!0;e?(r(u),u=st(o)):t?(s(a),a=st(i)):(a=st(i),u=st(o))}}(r,s,li,r=>{i.push(this.Sn(e,t,n,r))},r=>{i.push(this.bn(e,t,n,r))}),re.waitFor(i)}gn(e){let t=1;return ki(e).J({index:"sequenceNumberIndex",reverse:!0,range:IDBKeyRange.upperBound([this.uid,Number.MAX_SAFE_INTEGER])},(e,n,r)=>{r.done(),t=n.sequenceNumber+1}).next(()=>t)}createRange(e,t,n){n=n.sort((e,t)=>li(e,t)).filter((e,t,n)=>!t||0!==li(e,n[t-1]));const r=[];r.push(e);for(const i of n){const n=li(i,e),s=li(i,t);if(0===n)r[0]=e.Jt();else if(n>0&&s<0)r.push(i),r.push(i.Jt());else if(s>0)break}r.push(t);const s=[];for(let i=0;i<r.length;i+=2){if(this.Dn(r[i],r[i+1]))return[];const e=[r[i].indexId,this.uid,r[i].arrayValue,r[i].directionalValue,_i,[]],t=[r[i+1].indexId,this.uid,r[i+1].arrayValue,r[i+1].directionalValue,_i,[]];s.push(IDBKeyRange.bound(e,t))}return s}Dn(e,t){return li(e,t)>0}getMinOffsetFromCollectionGroup(e,t){return this.getFieldIndexes(e,t).next(Ni)}getMinOffset(e,t){return re.mapArray(this.cn(t),t=>this.ln(e,t).next(e=>e||v())).next(Ni)}}function xi(e){return We(e,"collectionParents")}function Ci(e){return We(e,"indexEntries")}function Di(e){return We(e,"indexConfiguration")}function ki(e){return We(e,"indexState")}function Ni(e){I(0!==e.length);let t=e[0].indexState.offset,n=t.largestBatchId;for(let r=1;r<e.length;r++){const s=e[r].indexState.offset;Z(s,t)<0&&(t=s),n<s.largestBatchId&&(n=s.largestBatchId)}return new X(t.readTime,t.documentKey,n)}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Ai={didRun:!1,sequenceNumbersCollected:0,targetsRemoved:0,documentsRemoved:0};class Mi{constructor(e,t,n){this.cacheSizeCollectionThreshold=e,this.percentileToCollect=t,this.maximumSequenceNumbersToCollect=n}static withCacheSize(e){return new Mi(e,Mi.DEFAULT_COLLECTION_PERCENTILE,Mi.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ri(e,t,n){const r=e.store("mutations"),s=e.store("documentMutations"),i=[],o=IDBKeyRange.only(n.batchId);let a=0;const u=r.J({range:o},(e,t,n)=>(a++,n.delete()));i.push(u.next(()=>{I(1===a)}));const c=[];for(const l of n.mutations){const e=xe(t,l.key.path,n.batchId);i.push(s.delete(e)),c.push(l.key)}return re.waitFor(i).next(()=>c)}function Vi(e){if(!e)return 0;let t;if(e.document)t=e.document;else if(e.unknownDocument)t=e.unknownDocument;else{if(!e.noDocument)throw v();t=e.noDocument}return JSON.stringify(t).length}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */Mi.DEFAULT_COLLECTION_PERCENTILE=10,Mi.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT=1e3,Mi.DEFAULT=new Mi(41943040,Mi.DEFAULT_COLLECTION_PERCENTILE,Mi.DEFAULT_MAX_SEQUENCE_NUMBERS_TO_COLLECT),Mi.DISABLED=new Mi(-1,0,0);class Oi{constructor(e,t,n,r){this.userId=e,this.serializer=t,this.indexManager=n,this.referenceDelegate=r,this.Cn={}}static lt(e,t,n,r){I(""!==e.uid);const s=e.isAuthenticated()?e.uid:"";return new Oi(s,t,n,r)}checkEmpty(e){let t=!0;const n=IDBKeyRange.bound([this.userId,Number.NEGATIVE_INFINITY],[this.userId,Number.POSITIVE_INFINITY]);return Li(e).J({index:"userMutationsIndex",range:n},(e,n,r)=>{t=!1,r.done()}).next(()=>t)}addMutationBatch(e,t,n,r){const s=Pi(e),i=Li(e);return i.add({}).next(o=>{I("number"==typeof o);const a=new Nr(o,t,n,r),u=function(e,t,n){const r=n.baseMutations.map(t=>bs(e.ct,t)),s=n.mutations.map(t=>bs(e.ct,t));return{userId:t,batchId:n.batchId,localWriteTimeMs:n.localWriteTime.toMillis(),baseMutations:r,mutations:s}}(this.serializer,this.userId,a),c=[];let l=new nt((e,t)=>O(e.canonicalString(),t.canonicalString()));for(const e of r){const t=xe(this.userId,e.key.path,o);l=l.add(e.key.path.popLast()),c.push(i.put(u)),c.push(s.put(t,Ce))}return l.forEach(t=>{c.push(this.indexManager.addToCollectionParentIndex(e,t))}),e.addOnCommittedListener(()=>{this.Cn[o]=a.keys()}),re.waitFor(c).next(()=>a)})}lookupMutationBatch(e,t){return Li(e).get(t).next(e=>e?(I(e.userId===this.userId),Ks(this.serializer,e)):null)}vn(e,t){return this.Cn[t]?re.resolve(this.Cn[t]):this.lookupMutationBatch(e,t).next(e=>{if(e){const n=e.keys();return this.Cn[t]=n,n}return null})}getNextMutationBatchAfterBatchId(e,t){const n=t+1,r=IDBKeyRange.lowerBound([this.userId,n]);let s=null;return Li(e).J({index:"userMutationsIndex",range:r},(e,t,r)=>{t.userId===this.userId&&(I(t.batchId>=n),s=Ks(this.serializer,t)),r.done()}).next(()=>s)}getHighestUnacknowledgedBatchId(e){const t=IDBKeyRange.upperBound([this.userId,Number.POSITIVE_INFINITY]);let n=-1;return Li(e).J({index:"userMutationsIndex",range:t,reverse:!0},(e,t,r)=>{n=t.batchId,r.done()}).next(()=>n)}getAllMutationBatches(e){const t=IDBKeyRange.bound([this.userId,-1],[this.userId,Number.POSITIVE_INFINITY]);return Li(e).U("userMutationsIndex",t).next(e=>e.map(e=>Ks(this.serializer,e)))}getAllMutationBatchesAffectingDocumentKey(e,t){const n=Se(this.userId,t.path),r=IDBKeyRange.lowerBound(n),s=[];return Pi(e).J({range:r},(n,r,i)=>{const[o,a,u]=n,c=Te(a);if(o===this.userId&&t.path.isEqual(c))return Li(e).get(u).next(e=>{if(!e)throw v();I(e.userId===this.userId),s.push(Ks(this.serializer,e))});i.done()}).next(()=>s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new nt(O);const r=[];return t.forEach(t=>{const s=Se(this.userId,t.path),i=IDBKeyRange.lowerBound(s),o=Pi(e).J({range:i},(e,r,s)=>{const[i,o,a]=e,u=Te(o);i===this.userId&&t.path.isEqual(u)?n=n.add(a):s.done()});r.push(o)}),re.waitFor(r).next(()=>this.Fn(e,n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,r=n.length+1,s=Se(this.userId,n),i=IDBKeyRange.lowerBound(s);let o=new nt(O);return Pi(e).J({range:i},(e,t,s)=>{const[i,a,u]=e,c=Te(a);i===this.userId&&n.isPrefixOf(c)?c.length===r&&(o=o.add(u)):s.done()}).next(()=>this.Fn(e,o))}Fn(e,t){const n=[],r=[];return t.forEach(t=>{r.push(Li(e).get(t).next(e=>{if(null===e)throw v();I(e.userId===this.userId),n.push(Ks(this.serializer,e))}))}),re.waitFor(r).next(()=>n)}removeMutationBatch(e,t){return Ri(e._e,this.userId,t).next(n=>(e.addOnCommittedListener(()=>{this.Mn(t.batchId)}),re.forEach(n,t=>this.referenceDelegate.markPotentiallyOrphaned(e,t))))}Mn(e){delete this.Cn[e]}performConsistencyCheck(e){return this.checkEmpty(e).next(t=>{if(!t)return re.resolve();const n=IDBKeyRange.lowerBound(function(e){return[e]}(this.userId)),r=[];return Pi(e).J({range:n},(e,t,n)=>{if(e[0]===this.userId){const t=Te(e[1]);r.push(t)}else n.done()}).next(()=>{I(0===r.length)})})}containsKey(e,t){return Fi(e,this.userId,t)}xn(e){return Ui(e).get(this.userId).next(e=>e||{userId:this.userId,lastAcknowledgedBatchId:-1,lastStreamToken:""})}}function Fi(e,t,n){const r=Se(t,n.path),s=r[1],i=IDBKeyRange.lowerBound(r);let o=!1;return Pi(e).J({range:i,H:!0},(e,n,r)=>{const[i,a,u]=e;i===t&&a===s&&(o=!0),r.done()}).next(()=>o)}function Li(e){return We(e,"mutations")}function Pi(e){return We(e,"documentMutations")}function Ui(e){return We(e,"mutationQueues")}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class qi{constructor(e){this.On=e}next(){return this.On+=2,this.On}static Nn(){return new qi(0)}static Ln(){return new qi(-1)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Bi{constructor(e,t){this.referenceDelegate=e,this.serializer=t}allocateTargetId(e){return this.Bn(e).next(t=>{const n=new qi(t.highestTargetId);return t.highestTargetId=n.next(),this.kn(e,t).next(()=>t.highestTargetId)})}getLastRemoteSnapshotVersion(e){return this.Bn(e).next(e=>U.fromTimestamp(new P(e.lastRemoteSnapshotVersion.seconds,e.lastRemoteSnapshotVersion.nanoseconds)))}getHighestSequenceNumber(e){return this.Bn(e).next(e=>e.highestListenSequenceNumber)}setTargetsMetadata(e,t,n){return this.Bn(e).next(r=>(r.highestListenSequenceNumber=t,n&&(r.lastRemoteSnapshotVersion=n.toTimestamp()),t>r.highestListenSequenceNumber&&(r.highestListenSequenceNumber=t),this.kn(e,r)))}addTargetData(e,t){return this.qn(e,t).next(()=>this.Bn(e).next(n=>(n.targetCount+=1,this.Qn(t,n),this.kn(e,n))))}updateTargetData(e,t){return this.qn(e,t)}removeTargetData(e,t){return this.removeMatchingKeysForTargetId(e,t.targetId).next(()=>zi(e).delete(t.targetId)).next(()=>this.Bn(e)).next(t=>(I(t.targetCount>0),t.targetCount-=1,this.kn(e,t)))}removeTargets(e,t,n){let r=0;const s=[];return zi(e).J((i,o)=>{const a=js(o);a.sequenceNumber<=t&&null===n.get(a.targetId)&&(r++,s.push(this.removeTargetData(e,a)))}).next(()=>re.waitFor(s)).next(()=>r)}forEachTarget(e,t){return zi(e).J((e,n)=>{const r=js(n);t(r)})}Bn(e){return Gi(e).get("targetGlobalKey").next(e=>(I(null!==e),e))}kn(e,t){return Gi(e).put("targetGlobalKey",t)}qn(e,t){return zi(e).put($s(this.serializer,t))}Qn(e,t){let n=!1;return e.targetId>t.highestTargetId&&(t.highestTargetId=e.targetId,n=!0),e.sequenceNumber>t.highestListenSequenceNumber&&(t.highestListenSequenceNumber=e.sequenceNumber,n=!0),n}getTargetCount(e){return this.Bn(e).next(e=>e.targetCount)}getTargetData(e,t){const n=mn(t),r=IDBKeyRange.bound([n,Number.NEGATIVE_INFINITY],[n,Number.POSITIVE_INFINITY]);let s=null;return zi(e).J({range:r,index:"queryTargetsIndex"},(e,n,r)=>{const i=js(n);gn(t,i.target)&&(s=i,r.done())}).next(()=>s)}addMatchingKeys(e,t,n){const r=[],s=Ki(e);return t.forEach(t=>{const i=Ie(t.path);r.push(s.put({targetId:n,path:i})),r.push(this.referenceDelegate.addReference(e,n,t))}),re.waitFor(r)}removeMatchingKeys(e,t,n){const r=Ki(e);return re.forEach(t,t=>{const s=Ie(t.path);return re.waitFor([r.delete([n,s]),this.referenceDelegate.removeReference(e,n,t)])})}removeMatchingKeysForTargetId(e,t){const n=Ki(e),r=IDBKeyRange.bound([t],[t+1],!1,!0);return n.delete(r)}getMatchingKeysForTargetId(e,t){const n=IDBKeyRange.bound([t],[t+1],!1,!0),r=Ki(e);let s=Hn();return r.J({range:n,H:!0},(e,t,n)=>{const r=Te(e[1]),i=new K(r);s=s.add(i)}).next(()=>s)}containsKey(e,t){const n=Ie(t.path),r=IDBKeyRange.bound([n],[L(n)],!1,!0);let s=0;return Ki(e).J({index:"documentTargetsIndex",H:!0,range:r},([e,t],n,r)=>{0!==e&&(s++,r.done())}).next(()=>s>0)}ot(e,t){return zi(e).get(t).next(e=>e?js(e):null)}}function zi(e){return We(e,"targets")}function Gi(e){return We(e,"targetGlobal")}function Ki(e){return We(e,"targetDocuments")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ji([e,t],[n,r]){const s=O(e,n);return 0===s?O(t,r):s}class $i{constructor(e){this.Kn=e,this.buffer=new nt(ji),this.$n=0}Un(){return++this.$n}Wn(e){const t=[e,this.Un()];if(this.buffer.size<this.Kn)this.buffer=this.buffer.add(t);else{const e=this.buffer.last();ji(t,e)<0&&(this.buffer=this.buffer.delete(e).add(t))}}get maxValue(){return this.buffer.last()[0]}}class Qi{constructor(e,t,n){this.garbageCollector=e,this.asyncQueue=t,this.localStore=n,this.Gn=null}start(){-1!==this.garbageCollector.params.cacheSizeCollectionThreshold&&this.zn(6e4)}stop(){this.Gn&&(this.Gn.cancel(),this.Gn=null)}get started(){return null!==this.Gn}zn(e){g("LruGarbageCollector",`Garbage collection scheduled in ${e}ms`),this.Gn=this.asyncQueue.enqueueAfterDelay("lru_garbage_collection",e,async()=>{this.Gn=null;try{await this.localStore.collectGarbage(this.garbageCollector)}catch(e){ce(e)?g("LruGarbageCollector","Ignoring IndexedDB error during garbage collection: ",e):await ne(e)}await this.zn(3e5)})}}class Hi{constructor(e,t){this.jn=e,this.params=t}calculateTargetCount(e,t){return this.jn.Hn(e).next(e=>Math.floor(t/100*e))}nthSequenceNumber(e,t){if(0===t)return re.resolve(pe.oe);const n=new $i(t);return this.jn.forEachTarget(e,e=>n.Wn(e.sequenceNumber)).next(()=>this.jn.Jn(e,e=>n.Wn(e))).next(()=>n.maxValue)}removeTargets(e,t,n){return this.jn.removeTargets(e,t,n)}removeOrphanedDocuments(e,t){return this.jn.removeOrphanedDocuments(e,t)}collect(e,t){return-1===this.params.cacheSizeCollectionThreshold?(g("LruGarbageCollector","Garbage collection skipped; disabled"),re.resolve(Ai)):this.getCacheSize(e).next(n=>n<this.params.cacheSizeCollectionThreshold?(g("LruGarbageCollector",`Garbage collection skipped; Cache size ${n} is lower than threshold ${this.params.cacheSizeCollectionThreshold}`),Ai):this.Yn(e,t))}getCacheSize(e){return this.jn.getCacheSize(e)}Yn(e,t){let n,r,s,i,a,u,c;const l=Date.now();return this.calculateTargetCount(e,this.params.percentileToCollect).next(t=>(t>this.params.maximumSequenceNumbersToCollect?(g("LruGarbageCollector",`Capping sequence numbers to collect down to the maximum of ${this.params.maximumSequenceNumbersToCollect} from ${t}`),r=this.params.maximumSequenceNumbersToCollect):r=t,i=Date.now(),this.nthSequenceNumber(e,r))).next(r=>(n=r,a=Date.now(),this.removeTargets(e,n,t))).next(t=>(s=t,u=Date.now(),this.removeOrphanedDocuments(e,n))).next(e=>(c=Date.now(),m()<=o["a"].DEBUG&&g("LruGarbageCollector",`LRU Garbage Collection\n\tCounted targets in ${i-l}ms\n\tDetermined least recently used ${r} in `+(a-i)+"ms\n"+`\tRemoved ${s} targets in `+(u-a)+"ms\n"+`\tRemoved ${e} documents in `+(c-u)+"ms\n"+`Total Duration: ${c-l}ms`),re.resolve({didRun:!0,sequenceNumbersCollected:r,targetsRemoved:s,documentsRemoved:e})))}}function Wi(e,t){return new Hi(e,t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ji{constructor(e,t){this.db=e,this.garbageCollector=Wi(this,t)}Hn(e){const t=this.Zn(e);return this.db.getTargetCache().getTargetCount(e).next(e=>t.next(t=>e+t))}Zn(e){let t=0;return this.Jn(e,e=>{t++}).next(()=>t)}forEachTarget(e,t){return this.db.getTargetCache().forEachTarget(e,t)}Jn(e,t){return this.Xn(e,(e,n)=>t(n))}addReference(e,t,n){return Yi(e,n)}removeReference(e,t,n){return Yi(e,n)}removeTargets(e,t,n){return this.db.getTargetCache().removeTargets(e,t,n)}markPotentiallyOrphaned(e,t){return Yi(e,t)}er(e,t){return function(e,t){let n=!1;return Ui(e).Y(r=>Fi(e,r,t).next(e=>(e&&(n=!0),re.resolve(!e)))).next(()=>n)}(e,t)}removeOrphanedDocuments(e,t){const n=this.db.getRemoteDocumentCache().newChangeBuffer(),r=[];let s=0;return this.Xn(e,(i,o)=>{if(o<=t){const t=this.er(e,i).next(t=>{if(!t)return s++,n.getEntry(e,i).next(()=>(n.removeEntry(i,U.min()),Ki(e).delete(function(e){return[0,Ie(e.path)]}(i))))});r.push(t)}}).next(()=>re.waitFor(r)).next(()=>n.apply(e)).next(()=>s)}removeTarget(e,t){const n=t.withSequenceNumber(e.currentSequenceNumber);return this.db.getTargetCache().updateTargetData(e,n)}updateLimboDocument(e,t){return Yi(e,t)}Xn(e,t){const n=Ki(e);let r,s=pe.oe;return n.J({index:"documentTargetsIndex"},([e,n],{path:i,sequenceNumber:o})=>{0===e?(s!==pe.oe&&t(new K(Te(r)),s),s=o,r=i):s=pe.oe}).next(()=>{s!==pe.oe&&t(new K(Te(r)),s)})}getCacheSize(e){return this.db.getRemoteDocumentCache().getSize(e)}}function Yi(e,t){return Ki(e).put(function(e,t){return{targetId:0,path:Ie(e.path),sequenceNumber:t}}(t,e.currentSequenceNumber))}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Xi{constructor(){this.changes=new Ln(e=>e.toString(),(e,t)=>e.isEqual(t)),this.changesApplied=!1}addEntry(e){this.assertNotApplied(),this.changes.set(e.key,e)}removeEntry(e,t){this.assertNotApplied(),this.changes.set(e,qt.newInvalidDocument(e).setReadTime(t))}getEntry(e,t){this.assertNotApplied();const n=this.changes.get(t);return void 0!==n?re.resolve(n):this.getFromCache(e,t)}getEntries(e,t){return this.getAllFromCache(e,t)}apply(e){return this.assertNotApplied(),this.changesApplied=!0,this.applyChanges(e)}assertNotApplied(){}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Zi{constructor(e){this.serializer=e}setIndexManager(e){this.indexManager=e}addEntry(e,t,n){return ro(e).put(n)}removeEntry(e,t,n){return ro(e).delete(function(e,t){const n=e.path.toArray();return[n.slice(0,n.length-2),n[n.length-2],Bs(t),n[n.length-1]]}(t,n))}updateMetadata(e,t){return this.getMetadata(e).next(n=>(n.byteSize+=t,this.tr(e,n)))}getEntry(e,t){let n=qt.newInvalidDocument(t);return ro(e).J({index:"documentKeyIndex",range:IDBKeyRange.only(so(t))},(e,r)=>{n=this.nr(t,r)}).next(()=>n)}rr(e,t){let n={size:0,document:qt.newInvalidDocument(t)};return ro(e).J({index:"documentKeyIndex",range:IDBKeyRange.only(so(t))},(e,r)=>{n={document:this.nr(t,r),size:Vi(r)}}).next(()=>n)}getEntries(e,t){let n=Un();return this.ir(e,t,(e,t)=>{const r=this.nr(e,t);n=n.insert(e,r)}).next(()=>n)}sr(e,t){let n=Un(),r=new Ze(K.comparator);return this.ir(e,t,(e,t)=>{const s=this.nr(e,t);n=n.insert(e,s),r=r.insert(e,Vi(t))}).next(()=>({documents:n,_r:r}))}ir(e,t,n){if(t.isEmpty())return re.resolve();let r=new nt(oo);t.forEach(e=>r=r.add(e));const s=IDBKeyRange.bound(so(r.first()),so(r.last())),i=r.getIterator();let o=i.getNext();return ro(e).J({index:"documentKeyIndex",range:s},(e,t,r)=>{const s=K.fromSegments([...t.prefixPath,t.collectionGroup,t.documentId]);for(;o&&oo(o,s)<0;)n(o,null),o=i.getNext();o&&o.isEqual(s)&&(n(o,t),o=i.hasNext()?i.getNext():null),o?r.$(so(o)):r.done()}).next(()=>{for(;o;)n(o,null),o=i.hasNext()?i.getNext():null})}getDocumentsMatchingQuery(e,t,n,r,s){const i=t.path,o=[i.popLast().toArray(),i.lastSegment(),Bs(n.readTime),n.documentKey.path.isEmpty()?"":n.documentKey.path.lastSegment()],a=[i.popLast().toArray(),i.lastSegment(),[Number.MAX_SAFE_INTEGER,Number.MAX_SAFE_INTEGER],""];return ro(e).U(IDBKeyRange.bound(o,a,!0)).next(e=>{null==s||s.incrementDocumentReadCount(e.length);let n=Un();for(const s of e){const e=this.nr(K.fromSegments(s.prefixPath.concat(s.collectionGroup,s.documentId)),s);e.isFoundDocument()&&(Rn(t,e)||r.has(e.key))&&(n=n.insert(e.key,e))}return n})}getAllFromCollectionGroup(e,t,n,r){let s=Un();const i=io(t,n),o=io(t,X.max());return ro(e).J({index:"collectionGroupIndex",range:IDBKeyRange.bound(i,o,!0)},(e,t,n)=>{const i=this.nr(K.fromSegments(t.prefixPath.concat(t.collectionGroup,t.documentId)),t);s=s.insert(i.key,i),s.size===r&&n.done()}).next(()=>s)}newChangeBuffer(e){return new to(this,!!e&&e.trackRemovals)}getSize(e){return this.getMetadata(e).next(e=>e.byteSize)}getMetadata(e){return no(e).get("remoteDocumentGlobalKey").next(e=>(I(!!e),e))}tr(e,t){return no(e).put("remoteDocumentGlobalKey",t)}nr(e,t){if(t){const e=Us(this.serializer,t);if(!e.isNoDocument()||!e.version.isEqual(U.min()))return e}return qt.newInvalidDocument(e)}}function eo(e){return new Zi(e)}class to extends Xi{constructor(e,t){super(),this.ar=e,this.trackRemovals=t,this.ur=new Ln(e=>e.toString(),(e,t)=>e.isEqual(t))}applyChanges(e){const t=[];let n=0,r=new nt((e,t)=>O(e.canonicalString(),t.canonicalString()));return this.changes.forEach((s,i)=>{const o=this.ur.get(s);if(t.push(this.ar.removeEntry(e,s,o.readTime)),i.isValidDocument()){const a=qs(this.ar.serializer,i);r=r.add(s.path.popLast());const u=Vi(a);n+=u-o.size,t.push(this.ar.addEntry(e,s,a))}else if(n-=o.size,this.trackRemovals){const n=qs(this.ar.serializer,i.convertToNoDocument(U.min()));t.push(this.ar.addEntry(e,s,n))}}),r.forEach(n=>{t.push(this.ar.indexManager.addToCollectionParentIndex(e,n))}),t.push(this.ar.updateMetadata(e,n)),re.waitFor(t)}getFromCache(e,t){return this.ar.rr(e,t).next(e=>(this.ur.set(t,{size:e.size,readTime:e.document.readTime}),e.document))}getAllFromCache(e,t){return this.ar.sr(e,t).next(({documents:e,_r:t})=>(t.forEach((t,n)=>{this.ur.set(t,{size:n,readTime:e.get(t).readTime})}),e))}}function no(e){return We(e,"remoteDocumentGlobal")}function ro(e){return We(e,"remoteDocumentsV14")}function so(e){const t=e.path.toArray();return[t.slice(0,t.length-2),t[t.length-2],t[t.length-1]]}function io(e,t){const n=t.documentKey.path.toArray();return[e,Bs(t.readTime),n.slice(0,n.length-2),n.length>0?n[n.length-1]:""]}function oo(e,t){const n=e.path.toArray(),r=t.path.toArray();let s=0;for(let i=0;i<n.length-2&&i<r.length-2;++i)if(s=O(n[i],r[i]),s)return s;return s=O(n.length,r.length),s||(s=O(n[n.length-2],r[r.length-2]),s||O(n[n.length-1],r[r.length-1]))
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class ao{constructor(e,t){this.overlayedDocument=e,this.mutatedFields=t}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class uo{constructor(e,t,n,r){this.remoteDocumentCache=e,this.mutationQueue=t,this.documentOverlayCache=n,this.indexManager=r}getDocument(e,t){let n=null;return this.documentOverlayCache.getOverlay(e,t).next(r=>(n=r,this.remoteDocumentCache.getEntry(e,t))).next(e=>(null!==n&&Ir(n.mutation,e,it.empty(),P.now()),e))}getDocuments(e,t){return this.remoteDocumentCache.getEntries(e,t).next(t=>this.getLocalViewOfDocuments(e,t,Hn()).next(()=>t))}getLocalViewOfDocuments(e,t,n=Hn()){const r=Gn();return this.populateOverlays(e,r,t).next(()=>this.computeViews(e,t,r,n).next(e=>{let t=Bn();return e.forEach((e,n)=>{t=t.insert(e,n.overlayedDocument)}),t}))}getOverlayedDocuments(e,t){const n=Gn();return this.populateOverlays(e,n,t).next(()=>this.computeViews(e,t,n,Hn()))}populateOverlays(e,t,n){const r=[];return n.forEach(e=>{t.has(e)||r.push(e)}),this.documentOverlayCache.getOverlays(e,r).next(e=>{e.forEach((e,n)=>{t.set(e,n)})})}computeViews(e,t,n,r){let s=Un();const i=jn(),o=function(){return jn()}();return t.forEach((e,t)=>{const o=n.get(t.key);r.has(t.key)&&(void 0===o||o.mutation instanceof _r)?s=s.insert(t.key,t):void 0!==o?(i.set(t.key,o.mutation.getFieldMask()),Ir(o.mutation,t,o.mutation.getFieldMask(),P.now())):i.set(t.key,it.empty())}),this.recalculateAndSaveOverlays(e,s).next(e=>(e.forEach((e,t)=>i.set(e,t)),t.forEach((e,t)=>{var n;return o.set(e,new ao(t,null!==(n=i.get(e))&&void 0!==n?n:null))}),o))}recalculateAndSaveOverlays(e,t){const n=jn();let r=new Ze((e,t)=>e-t),s=Hn();return this.mutationQueue.getAllMutationBatchesAffectingDocumentKeys(e,t).next(e=>{for(const s of e)s.keys().forEach(e=>{const i=t.get(e);if(null===i)return;let o=n.get(e)||it.empty();o=s.applyToLocalView(i,o),n.set(e,o);const a=(r.get(s.batchId)||Hn()).add(e);r=r.insert(s.batchId,a)})}).next(()=>{const i=[],o=r.getReverseIterator();for(;o.hasNext();){const r=o.getNext(),a=r.key,u=r.value,c=Kn();u.forEach(e=>{if(!s.has(e)){const r=wr(t.get(e),n.get(e));null!==r&&c.set(e,r),s=s.add(e)}}),i.push(this.documentOverlayCache.saveOverlays(e,a,c))}return re.waitFor(i)}).next(()=>n)}recalculateAndSaveOverlaysForDocumentKeys(e,t){return this.remoteDocumentCache.getEntries(e,t).next(t=>this.recalculateAndSaveOverlays(e,t))}getDocumentsMatchingQuery(e,t,n,r){return function(e){return K.isDocumentKey(e.path)&&null===e.collectionGroup&&0===e.filters.length}(t)?this.getDocumentsMatchingDocumentQuery(e,t.path):_n(t)?this.getDocumentsMatchingCollectionGroupQuery(e,t,n,r):this.getDocumentsMatchingCollectionQuery(e,t,n,r)}getNextDocuments(e,t,n,r){return this.remoteDocumentCache.getAllFromCollectionGroup(e,t,n,r).next(s=>{const i=r-s.size>0?this.documentOverlayCache.getOverlaysForCollectionGroup(e,t,n.largestBatchId,r-s.size):re.resolve(Gn());let o=-1,a=s;return i.next(t=>re.forEach(t,(t,n)=>(o<n.largestBatchId&&(o=n.largestBatchId),s.get(t)?re.resolve():this.remoteDocumentCache.getEntry(e,t).next(e=>{a=a.insert(t,e)}))).next(()=>this.populateOverlays(e,t,s)).next(()=>this.computeViews(e,a,t,Hn())).next(e=>({batchId:o,changes:zn(e)})))})}getDocumentsMatchingDocumentQuery(e,t){return this.getDocument(e,new K(t)).next(e=>{let t=Bn();return e.isFoundDocument()&&(t=t.insert(e.key,e)),t})}getDocumentsMatchingCollectionGroupQuery(e,t,n,r){const s=t.collectionGroup;let i=Bn();return this.indexManager.getCollectionParents(e,s).next(o=>re.forEach(o,o=>{const a=function(e,t){return new In(t,null,e.explicitOrderBy.slice(),e.filters.slice(),e.limit,e.limitType,e.startAt,e.endAt)}(t,o.child(s));return this.getDocumentsMatchingCollectionQuery(e,a,n,r).next(e=>{e.forEach((e,t)=>{i=i.insert(e,t)})})}).next(()=>i))}getDocumentsMatchingCollectionQuery(e,t,n,r){let s;return this.documentOverlayCache.getOverlaysForCollection(e,t.path,n.largestBatchId).next(i=>(s=i,this.remoteDocumentCache.getDocumentsMatchingQuery(e,t,n,s,r))).next(e=>{s.forEach((t,n)=>{const r=n.getKey();null===e.get(r)&&(e=e.insert(r,qt.newInvalidDocument(r)))});let n=Bn();return e.forEach((e,r)=>{const i=s.get(e);void 0!==i&&Ir(i.mutation,r,it.empty(),P.now()),Rn(t,r)&&(n=n.insert(e,r))}),n})}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class co{constructor(e){this.serializer=e,this.cr=new Map,this.lr=new Map}getBundleMetadata(e,t){return re.resolve(this.cr.get(t))}saveBundleMetadata(e,t){return this.cr.set(t.id,function(e){return{id:e.id,version:e.version,createTime:us(e.createTime)}}(t)),re.resolve()}getNamedQuery(e,t){return re.resolve(this.lr.get(t))}saveNamedQuery(e,t){return this.lr.set(t.name,function(e){return{name:e.name,query:Qs(e.bundledQuery),readTime:us(e.readTime)}}(t)),re.resolve()}}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class lo{constructor(){this.overlays=new Ze(K.comparator),this.hr=new Map}getOverlay(e,t){return re.resolve(this.overlays.get(t))}getOverlays(e,t){const n=Gn();return re.forEach(t,t=>this.getOverlay(e,t).next(e=>{null!==e&&n.set(t,e)})).next(()=>n)}saveOverlays(e,t,n){return n.forEach((n,r)=>{this.ht(e,t,r)}),re.resolve()}removeOverlaysForBatchId(e,t,n){const r=this.hr.get(n);return void 0!==r&&(r.forEach(e=>this.overlays=this.overlays.remove(e)),this.hr.delete(n)),re.resolve()}getOverlaysForCollection(e,t,n){const r=Gn(),s=t.length+1,i=new K(t.child("")),o=this.overlays.getIteratorFrom(i);for(;o.hasNext();){const e=o.getNext().value,i=e.getKey();if(!t.isPrefixOf(i.path))break;i.path.length===s&&e.largestBatchId>n&&r.set(e.getKey(),e)}return re.resolve(r)}getOverlaysForCollectionGroup(e,t,n,r){let s=new Ze((e,t)=>e-t);const i=this.overlays.getIterator();for(;i.hasNext();){const e=i.getNext().value;if(e.getKey().getCollectionGroup()===t&&e.largestBatchId>n){let t=s.get(e.largestBatchId);null===t&&(t=Gn(),s=s.insert(e.largestBatchId,t)),t.set(e.getKey(),e)}}const o=Gn(),a=s.getIterator();for(;a.hasNext();)if(a.getNext().value.forEach((e,t)=>o.set(e,t)),o.size()>=r)break;return re.resolve(o)}ht(e,t,n){const r=this.overlays.get(n.key);if(null!==r){const e=this.hr.get(r.largestBatchId).delete(n.key);this.hr.set(r.largestBatchId,e)}this.overlays=this.overlays.insert(n.key,new Mr(t,n));let s=this.hr.get(t);void 0===s&&(s=Hn(),this.hr.set(t,s)),this.hr.set(t,s.add(n.key))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ho{constructor(){this.Pr=new nt(fo.Ir),this.Tr=new nt(fo.Er)}isEmpty(){return this.Pr.isEmpty()}addReference(e,t){const n=new fo(e,t);this.Pr=this.Pr.add(n),this.Tr=this.Tr.add(n)}dr(e,t){e.forEach(e=>this.addReference(e,t))}removeReference(e,t){this.Ar(new fo(e,t))}Rr(e,t){e.forEach(e=>this.removeReference(e,t))}Vr(e){const t=new K(new B([])),n=new fo(t,e),r=new fo(t,e+1),s=[];return this.Tr.forEachInRange([n,r],e=>{this.Ar(e),s.push(e.key)}),s}mr(){this.Pr.forEach(e=>this.Ar(e))}Ar(e){this.Pr=this.Pr.delete(e),this.Tr=this.Tr.delete(e)}gr(e){const t=new K(new B([])),n=new fo(t,e),r=new fo(t,e+1);let s=Hn();return this.Tr.forEachInRange([n,r],e=>{s=s.add(e.key)}),s}containsKey(e){const t=new fo(e,0),n=this.Pr.firstAfterOrEqual(t);return null!==n&&e.isEqual(n.key)}}class fo{constructor(e,t){this.key=e,this.pr=t}static Ir(e,t){return K.comparator(e.key,t.key)||O(e.pr,t.pr)}static Er(e,t){return O(e.pr,t.pr)||K.comparator(e.key,t.key)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class mo{constructor(e,t){this.indexManager=e,this.referenceDelegate=t,this.mutationQueue=[],this.yr=1,this.wr=new nt(fo.Ir)}checkEmpty(e){return re.resolve(0===this.mutationQueue.length)}addMutationBatch(e,t,n,r){const s=this.yr;this.yr++,this.mutationQueue.length>0&&this.mutationQueue[this.mutationQueue.length-1];const i=new Nr(s,t,n,r);this.mutationQueue.push(i);for(const o of r)this.wr=this.wr.add(new fo(o.key,s)),this.indexManager.addToCollectionParentIndex(e,o.key.path.popLast());return re.resolve(i)}lookupMutationBatch(e,t){return re.resolve(this.Sr(t))}getNextMutationBatchAfterBatchId(e,t){const n=t+1,r=this.br(n),s=r<0?0:r;return re.resolve(this.mutationQueue.length>s?this.mutationQueue[s]:null)}getHighestUnacknowledgedBatchId(){return re.resolve(0===this.mutationQueue.length?-1:this.yr-1)}getAllMutationBatches(e){return re.resolve(this.mutationQueue.slice())}getAllMutationBatchesAffectingDocumentKey(e,t){const n=new fo(t,0),r=new fo(t,Number.POSITIVE_INFINITY),s=[];return this.wr.forEachInRange([n,r],e=>{const t=this.Sr(e.pr);s.push(t)}),re.resolve(s)}getAllMutationBatchesAffectingDocumentKeys(e,t){let n=new nt(O);return t.forEach(e=>{const t=new fo(e,0),r=new fo(e,Number.POSITIVE_INFINITY);this.wr.forEachInRange([t,r],e=>{n=n.add(e.pr)})}),re.resolve(this.Dr(n))}getAllMutationBatchesAffectingQuery(e,t){const n=t.path,r=n.length+1;let s=n;K.isDocumentKey(s)||(s=s.child(""));const i=new fo(new K(s),0);let o=new nt(O);return this.wr.forEachWhile(e=>{const t=e.key.path;return!!n.isPrefixOf(t)&&(t.length===r&&(o=o.add(e.pr)),!0)},i),re.resolve(this.Dr(o))}Dr(e){const t=[];return e.forEach(e=>{const n=this.Sr(e);null!==n&&t.push(n)}),t}removeMutationBatch(e,t){I(0===this.Cr(t.batchId,"removed")),this.mutationQueue.shift();let n=this.wr;return re.forEach(t.mutations,r=>{const s=new fo(r.key,t.batchId);return n=n.delete(s),this.referenceDelegate.markPotentiallyOrphaned(e,r.key)}).next(()=>{this.wr=n})}Mn(e){}containsKey(e,t){const n=new fo(t,0),r=this.wr.firstAfterOrEqual(n);return re.resolve(t.isEqual(r&&r.key))}performConsistencyCheck(e){return this.mutationQueue.length,re.resolve()}Cr(e,t){return this.br(e)}br(e){return 0===this.mutationQueue.length?0:e-this.mutationQueue[0].batchId}Sr(e){const t=this.br(e);return t<0||t>=this.mutationQueue.length?null:this.mutationQueue[t]}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class go{constructor(e){this.vr=e,this.docs=function(){return new Ze(K.comparator)}(),this.size=0}setIndexManager(e){this.indexManager=e}addEntry(e,t){const n=t.key,r=this.docs.get(n),s=r?r.size:0,i=this.vr(t);return this.docs=this.docs.insert(n,{document:t.mutableCopy(),size:i}),this.size+=i-s,this.indexManager.addToCollectionParentIndex(e,n.path.popLast())}removeEntry(e){const t=this.docs.get(e);t&&(this.docs=this.docs.remove(e),this.size-=t.size)}getEntry(e,t){const n=this.docs.get(t);return re.resolve(n?n.document.mutableCopy():qt.newInvalidDocument(t))}getEntries(e,t){let n=Un();return t.forEach(e=>{const t=this.docs.get(e);n=n.insert(e,t?t.document.mutableCopy():qt.newInvalidDocument(e))}),re.resolve(n)}getDocumentsMatchingQuery(e,t,n,r){let s=Un();const i=t.path,o=new K(i.child("")),a=this.docs.getIteratorFrom(o);for(;a.hasNext();){const{key:e,value:{document:o}}=a.getNext();if(!i.isPrefixOf(e.path))break;e.path.length>i.length+1||Z(Y(o),n)<=0||(r.has(o.key)||Rn(t,o))&&(s=s.insert(o.key,o.mutableCopy()))}return re.resolve(s)}getAllFromCollectionGroup(e,t,n,r){v()}Fr(e,t){return re.forEach(this.docs,e=>t(e))}newChangeBuffer(e){return new po(this)}getSize(e){return re.resolve(this.size)}}class po extends Xi{constructor(e){super(),this.ar=e}applyChanges(e){const t=[];return this.changes.forEach((n,r)=>{r.isValidDocument()?t.push(this.ar.addEntry(e,r)):this.ar.removeEntry(n)}),re.waitFor(t)}getFromCache(e,t){return this.ar.getEntry(e,t)}getAllFromCache(e,t){return this.ar.getEntries(e,t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class yo{constructor(e){this.persistence=e,this.Mr=new Ln(e=>mn(e),gn),this.lastRemoteSnapshotVersion=U.min(),this.highestTargetId=0,this.Or=0,this.Nr=new ho,this.targetCount=0,this.Lr=qi.Nn()}forEachTarget(e,t){return this.Mr.forEach((e,n)=>t(n)),re.resolve()}getLastRemoteSnapshotVersion(e){return re.resolve(this.lastRemoteSnapshotVersion)}getHighestSequenceNumber(e){return re.resolve(this.Or)}allocateTargetId(e){return this.highestTargetId=this.Lr.next(),re.resolve(this.highestTargetId)}setTargetsMetadata(e,t,n){return n&&(this.lastRemoteSnapshotVersion=n),t>this.Or&&(this.Or=t),re.resolve()}qn(e){this.Mr.set(e.target,e);const t=e.targetId;t>this.highestTargetId&&(this.Lr=new qi(t),this.highestTargetId=t),e.sequenceNumber>this.Or&&(this.Or=e.sequenceNumber)}addTargetData(e,t){return this.qn(t),this.targetCount+=1,re.resolve()}updateTargetData(e,t){return this.qn(t),re.resolve()}removeTargetData(e,t){return this.Mr.delete(t.target),this.Nr.Vr(t.targetId),this.targetCount-=1,re.resolve()}removeTargets(e,t,n){let r=0;const s=[];return this.Mr.forEach((i,o)=>{o.sequenceNumber<=t&&null===n.get(o.targetId)&&(this.Mr.delete(i),s.push(this.removeMatchingKeysForTargetId(e,o.targetId)),r++)}),re.waitFor(s).next(()=>r)}getTargetCount(e){return re.resolve(this.targetCount)}getTargetData(e,t){const n=this.Mr.get(t)||null;return re.resolve(n)}addMatchingKeys(e,t,n){return this.Nr.dr(t,n),re.resolve()}removeMatchingKeys(e,t,n){this.Nr.Rr(t,n);const r=this.persistence.referenceDelegate,s=[];return r&&t.forEach(t=>{s.push(r.markPotentiallyOrphaned(e,t))}),re.waitFor(s)}removeMatchingKeysForTargetId(e,t){return this.Nr.Vr(t),re.resolve()}getMatchingKeysForTargetId(e,t){const n=this.Nr.gr(t);return re.resolve(n)}containsKey(e,t){return re.resolve(this.Nr.containsKey(t))}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wo{constructor(e,t){this.Br={},this.overlays={},this.kr=new pe(0),this.qr=!1,this.qr=!0,this.referenceDelegate=e(this),this.Qr=new yo(this),this.indexManager=new Ei,this.remoteDocumentCache=function(e){return new go(e)}(e=>this.referenceDelegate.Kr(e)),this.serializer=new Ps(t),this.$r=new co(this.serializer)}start(){return Promise.resolve()}shutdown(){return this.qr=!1,Promise.resolve()}get started(){return this.qr}setDatabaseDeletedListener(){}setNetworkEnabled(){}getIndexManager(e){return this.indexManager}getDocumentOverlayCache(e){let t=this.overlays[e.toKey()];return t||(t=new lo,this.overlays[e.toKey()]=t),t}getMutationQueue(e,t){let n=this.Br[e.toKey()];return n||(n=new mo(t,this.referenceDelegate),this.Br[e.toKey()]=n),n}getTargetCache(){return this.Qr}getRemoteDocumentCache(){return this.remoteDocumentCache}getBundleCache(){return this.$r}runTransaction(e,t,n){g("MemoryPersistence","Starting transaction:",e);const r=new vo(this.kr.next());return this.referenceDelegate.Ur(),n(r).next(e=>this.referenceDelegate.Wr(r).next(()=>e)).toPromise().then(e=>(r.raiseOnCommittedEvent(),e))}Gr(e,t){return re.or(Object.values(this.Br).map(n=>()=>n.containsKey(e,t)))}}class vo extends te{constructor(e){super(),this.currentSequenceNumber=e}}class Io{constructor(e){this.persistence=e,this.zr=new ho,this.jr=null}static Hr(e){return new Io(e)}get Jr(){if(this.jr)return this.jr;throw v()}addReference(e,t,n){return this.zr.addReference(n,t),this.Jr.delete(n.toString()),re.resolve()}removeReference(e,t,n){return this.zr.removeReference(n,t),this.Jr.add(n.toString()),re.resolve()}markPotentiallyOrphaned(e,t){return this.Jr.add(t.toString()),re.resolve()}removeTarget(e,t){this.zr.Vr(t.targetId).forEach(e=>this.Jr.add(e.toString()));const n=this.persistence.getTargetCache();return n.getMatchingKeysForTargetId(e,t.targetId).next(e=>{e.forEach(e=>this.Jr.add(e.toString()))}).next(()=>n.removeTargetData(e,t))}Ur(){this.jr=new Set}Wr(e){const t=this.persistence.getRemoteDocumentCache().newChangeBuffer();return re.forEach(this.Jr,n=>{const r=K.fromPath(n);return this.Yr(e,r).next(e=>{e||t.removeEntry(r,U.min())})}).next(()=>(this.jr=null,t.apply(e)))}updateLimboDocument(e,t){return this.Yr(e,t).next(e=>{e?this.Jr.delete(t.toString()):this.Jr.add(t.toString())})}Kr(e){return 0}Yr(e,t){return re.or([()=>re.resolve(this.zr.containsKey(t)),()=>this.persistence.getTargetCache().containsKey(e,t),()=>this.persistence.Gr(e,t)])}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bo{constructor(e){this.serializer=e}O(e,t,n,r){const s=new se("createOrUpgrade",t);n<1&&r>=1&&(function(e){e.createObjectStore("owner")}(e),function(e){e.createObjectStore("mutationQueues",{keyPath:"userId"}),e.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",_e,{unique:!0}),e.createObjectStore("documentMutations")}(e),Eo(e),function(e){e.createObjectStore("remoteDocuments")}(e));let i=re.resolve();return n<3&&r>=3&&(0!==n&&(function(e){e.deleteObjectStore("targetDocuments"),e.deleteObjectStore("targets"),e.deleteObjectStore("targetGlobal")}(e),Eo(e)),i=i.next(()=>function(e){const t=e.store("targetGlobal"),n={highestTargetId:0,highestListenSequenceNumber:0,lastRemoteSnapshotVersion:U.min().toTimestamp(),targetCount:0};return t.put("targetGlobalKey",n)}(s))),n<4&&r>=4&&(0!==n&&(i=i.next(()=>function(e,t){return t.store("mutations").U().next(n=>{e.deleteObjectStore("mutations"),e.createObjectStore("mutations",{keyPath:"batchId",autoIncrement:!0}).createIndex("userMutationsIndex",_e,{unique:!0});const r=t.store("mutations"),s=n.map(e=>r.put(e));return re.waitFor(s)})}(e,s))),i=i.next(()=>{!function(e){e.createObjectStore("clientMetadata",{keyPath:"clientId"})}(e)})),n<5&&r>=5&&(i=i.next(()=>this.Xr(s))),n<6&&r>=6&&(i=i.next(()=>(function(e){e.createObjectStore("remoteDocumentGlobal")}(e),this.ei(s)))),n<7&&r>=7&&(i=i.next(()=>this.ti(s))),n<8&&r>=8&&(i=i.next(()=>this.ni(e,s))),n<9&&r>=9&&(i=i.next(()=>{!function(e){e.objectStoreNames.contains("remoteDocumentChanges")&&e.deleteObjectStore("remoteDocumentChanges")}(e)})),n<10&&r>=10&&(i=i.next(()=>this.ri(s))),n<11&&r>=11&&(i=i.next(()=>{!function(e){e.createObjectStore("bundles",{keyPath:"bundleId"})}(e),function(e){e.createObjectStore("namedQueries",{keyPath:"name"})}(e)})),n<12&&r>=12&&(i=i.next(()=>{!function(e){const t=e.createObjectStore("documentOverlays",{keyPath:Ue});t.createIndex("collectionPathOverlayIndex",qe,{unique:!1}),t.createIndex("collectionGroupOverlayIndex",Be,{unique:!1})}(e)})),n<13&&r>=13&&(i=i.next(()=>function(e){const t=e.createObjectStore("remoteDocumentsV14",{keyPath:De});t.createIndex("documentKeyIndex",ke),t.createIndex("collectionGroupIndex",Ne)}(e)).next(()=>this.ii(e,s)).next(()=>e.deleteObjectStore("remoteDocuments"))),n<14&&r>=14&&(i=i.next(()=>this.si(e,s))),n<15&&r>=15&&(i=i.next(()=>function(e){e.createObjectStore("indexConfiguration",{keyPath:"indexId",autoIncrement:!0}).createIndex("collectionGroupIndex","collectionGroup",{unique:!1}),e.createObjectStore("indexState",{keyPath:Oe}).createIndex("sequenceNumberIndex",Fe,{unique:!1}),e.createObjectStore("indexEntries",{keyPath:Le}).createIndex("documentKeyIndex",Pe,{unique:!1})}(e))),n<16&&r>=16&&(i=i.next(()=>{t.objectStore("indexState").clear()}).next(()=>{t.objectStore("indexEntries").clear()})),i}ei(e){let t=0;return e.store("remoteDocuments").J((e,n)=>{t+=Vi(n)}).next(()=>{const n={byteSize:t};return e.store("remoteDocumentGlobal").put("remoteDocumentGlobalKey",n)})}Xr(e){const t=e.store("mutationQueues"),n=e.store("mutations");return t.U().next(t=>re.forEach(t,t=>{const r=IDBKeyRange.bound([t.userId,-1],[t.userId,t.lastAcknowledgedBatchId]);return n.U("userMutationsIndex",r).next(n=>re.forEach(n,n=>{I(n.userId===t.userId);const r=Ks(this.serializer,n);return Ri(e,t.userId,r).next(()=>{})}))}))}ti(e){const t=e.store("targetDocuments"),n=e.store("remoteDocuments");return e.store("targetGlobal").get("targetGlobalKey").next(e=>{const r=[];return n.J((n,s)=>{const i=new B(n),o=function(e){return[0,Ie(e)]}(i);r.push(t.get(o).next(n=>n?re.resolve():(n=>t.put({targetId:0,path:Ie(n),sequenceNumber:e.highestListenSequenceNumber}))(i)))}).next(()=>re.waitFor(r))})}ni(e,t){e.createObjectStore("collectionParents",{keyPath:Ve});const n=t.store("collectionParents"),r=new Ti,s=e=>{if(r.add(e)){const t=e.lastSegment(),r=e.popLast();return n.put({collectionId:t,parent:Ie(r)})}};return t.store("remoteDocuments").J({H:!0},(e,t)=>{const n=new B(e);return s(n.popLast())}).next(()=>t.store("documentMutations").J({H:!0},([e,t,n],r)=>{const i=Te(t);return s(i.popLast())}))}ri(e){const t=e.store("targets");return t.J((e,n)=>{const r=js(n),s=$s(this.serializer,r);return t.put(s)})}ii(e,t){const n=t.store("remoteDocuments"),r=[];return n.J((e,n)=>{const s=t.store("remoteDocumentsV14"),i=function(e){return e.document?new K(B.fromString(e.document.name).popFirst(5)):e.noDocument?K.fromSegments(e.noDocument.path):e.unknownDocument?K.fromSegments(e.unknownDocument.path):v()}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(n).path.toArray(),o={prefixPath:i.slice(0,i.length-2),collectionGroup:i[i.length-2],documentId:i[i.length-1],readTime:n.readTime||[0,0],unknownDocument:n.unknownDocument,noDocument:n.noDocument,document:n.document,hasCommittedMutations:!!n.hasCommittedMutations};r.push(s.put(o))}).next(()=>re.waitFor(r))}si(e,t){const n=t.store("mutations"),r=eo(this.serializer),s=new wo(Io.Hr,this.serializer.ct);return n.U().next(e=>{const n=new Map;return e.forEach(e=>{var t;let r=null!==(t=n.get(e.userId))&&void 0!==t?t:Hn();Ks(this.serializer,e).keys().forEach(e=>r=r.add(e)),n.set(e.userId,r)}),re.forEach(n,(e,n)=>{const i=new h(n),o=ei.lt(this.serializer,i),a=s.getIndexManager(i),u=Oi.lt(i,this.serializer,a,s.referenceDelegate);return new uo(r,u,o,a).recalculateAndSaveOverlaysForDocumentKeys(new He(t,pe.oe),e).next()})})}}function Eo(e){e.createObjectStore("targetDocuments",{keyPath:Me}).createIndex("documentTargetsIndex",Re,{unique:!0}),e.createObjectStore("targets",{keyPath:"targetId"}).createIndex("queryTargetsIndex",Ae,{unique:!0}),e.createObjectStore("targetGlobal")}const To="Failed to obtain exclusive access to the persistence layer. To allow shared access, multi-tab synchronization has to be enabled in all tabs. If you are using `experimentalForceOwningTab:true`, make sure that only one tab has persistence enabled at any given time.";class _o{constructor(e,t,n,r,s,i,o,a,u,c,l=16){if(this.allowTabSynchronization=e,this.persistenceKey=t,this.clientId=n,this.oi=s,this.window=i,this.document=o,this._i=u,this.ai=c,this.ui=l,this.kr=null,this.qr=!1,this.isPrimary=!1,this.networkEnabled=!0,this.ci=null,this.inForeground=!1,this.li=null,this.hi=null,this.Pi=Number.NEGATIVE_INFINITY,this.Ii=e=>Promise.resolve(),!_o.D())throw new T(E.UNIMPLEMENTED,"This platform is either missing IndexedDB or is known to have an incomplete implementation. Offline persistence has been disabled.");this.referenceDelegate=new Ji(this,r),this.Ti=t+"main",this.serializer=new Ps(a),this.Ei=new ie(this.Ti,this.ui,new bo(this.serializer)),this.Qr=new Bi(this.referenceDelegate,this.serializer),this.remoteDocumentCache=eo(this.serializer),this.$r=new Ys,this.window&&this.window.localStorage?this.di=this.window.localStorage:(this.di=null,!1===c&&p("IndexedDbPersistence","LocalStorage is unavailable. As a result, persistence may not work reliably. In particular enablePersistence() could fail immediately after refreshing the page."))}start(){return this.Ai().then(()=>{if(!this.isPrimary&&!this.allowTabSynchronization)throw new T(E.FAILED_PRECONDITION,To);return this.Ri(),this.Vi(),this.mi(),this.runTransaction("getHighestListenSequenceNumber","readonly",e=>this.Qr.getHighestSequenceNumber(e))}).then(e=>{this.kr=new pe(e,this._i)}).then(()=>{this.qr=!0}).catch(e=>(this.Ei&&this.Ei.close(),Promise.reject(e)))}fi(e){return this.Ii=async t=>{if(this.started)return e(t)},e(this.isPrimary)}setDatabaseDeletedListener(e){this.Ei.L(async t=>{null===t.newVersion&&await e()})}setNetworkEnabled(e){this.networkEnabled!==e&&(this.networkEnabled=e,this.oi.enqueueAndForget(async()=>{this.started&&await this.Ai()}))}Ai(){return this.runTransaction("updateClientMetadataAndTryBecomePrimary","readwrite",e=>xo(e).put({clientId:this.clientId,updateTimeMs:Date.now(),networkEnabled:this.networkEnabled,inForeground:this.inForeground}).next(()=>{if(this.isPrimary)return this.gi(e).next(e=>{e||(this.isPrimary=!1,this.oi.enqueueRetryable(()=>this.Ii(!1)))})}).next(()=>this.pi(e)).next(t=>this.isPrimary&&!t?this.yi(e).next(()=>!1):!!t&&this.wi(e).next(()=>!0))).catch(e=>{if(ce(e))return g("IndexedDbPersistence","Failed to extend owner lease: ",e),this.isPrimary;if(!this.allowTabSynchronization)throw e;return g("IndexedDbPersistence","Releasing owner lease after error during lease refresh",e),!1}).then(e=>{this.isPrimary!==e&&this.oi.enqueueRetryable(()=>this.Ii(e)),this.isPrimary=e})}gi(e){return So(e).get("owner").next(e=>re.resolve(this.Si(e)))}bi(e){return xo(e).delete(this.clientId)}async Di(){if(this.isPrimary&&!this.Ci(this.Pi,18e5)){this.Pi=Date.now();const e=await this.runTransaction("maybeGarbageCollectMultiClientState","readwrite-primary",e=>{const t=We(e,"clientMetadata");return t.U().next(e=>{const n=this.vi(e,18e5),r=e.filter(e=>-1===n.indexOf(e));return re.forEach(r,e=>t.delete(e.clientId)).next(()=>r)})}).catch(()=>[]);if(this.di)for(const t of e)this.di.removeItem(this.Fi(t.clientId))}}mi(){this.hi=this.oi.enqueueAfterDelay("client_metadata_refresh",4e3,()=>this.Ai().then(()=>this.Di()).then(()=>this.mi()))}Si(e){return!!e&&e.ownerId===this.clientId}pi(e){return this.ai?re.resolve(!0):So(e).get("owner").next(t=>{if(null!==t&&this.Ci(t.leaseTimestampMs,5e3)&&!this.Mi(t.ownerId)){if(this.Si(t)&&this.networkEnabled)return!0;if(!this.Si(t)){if(!t.allowTabSynchronization)throw new T(E.FAILED_PRECONDITION,To);return!1}}return!(!this.networkEnabled||!this.inForeground)||xo(e).U().next(e=>void 0===this.vi(e,5e3).find(e=>{if(this.clientId!==e.clientId){const t=!this.networkEnabled&&e.networkEnabled,n=!this.inForeground&&e.inForeground,r=this.networkEnabled===e.networkEnabled;if(t||n&&r)return!0}return!1}))}).next(e=>(this.isPrimary!==e&&g("IndexedDbPersistence",`Client ${e?"is":"is not"} eligible for a primary lease.`),e))}async shutdown(){this.qr=!1,this.xi(),this.hi&&(this.hi.cancel(),this.hi=null),this.Oi(),this.Ni(),await this.Ei.runTransaction("shutdown","readwrite",["owner","clientMetadata"],e=>{const t=new He(e,pe.oe);return this.yi(t).next(()=>this.bi(t))}),this.Ei.close(),this.Li()}vi(e,t){return e.filter(e=>this.Ci(e.updateTimeMs,t)&&!this.Mi(e.clientId))}Bi(){return this.runTransaction("getActiveClients","readonly",e=>xo(e).U().next(e=>this.vi(e,18e5).map(e=>e.clientId)))}get started(){return this.qr}getMutationQueue(e,t){return Oi.lt(e,this.serializer,t,this.referenceDelegate)}getTargetCache(){return this.Qr}getRemoteDocumentCache(){return this.remoteDocumentCache}getIndexManager(e){return new Si(e,this.serializer.ct.databaseId)}getDocumentOverlayCache(e){return ei.lt(this.serializer,e)}getBundleCache(){return this.$r}runTransaction(e,t,n){g("IndexedDbPersistence","Starting transaction:",e);const r="readonly"===t?"readonly":"readwrite",s=function(e){return 16===e?Qe:15===e?$e:14===e?je:13===e?Ke:12===e?Ge:11===e?ze:void v()}(this.ui);let i;return this.Ei.runTransaction(e,r,s,r=>(i=new He(r,this.kr?this.kr.next():pe.oe),"readwrite-primary"===t?this.gi(i).next(e=>!!e||this.pi(i)).next(t=>{if(!t)throw p(`Failed to obtain primary lease for action '${e}'.`),this.isPrimary=!1,this.oi.enqueueRetryable(()=>this.Ii(!1)),new T(E.FAILED_PRECONDITION,ee);return n(i)}).next(e=>this.wi(i).next(()=>e)):this.ki(i).next(()=>n(i)))).then(e=>(i.raiseOnCommittedEvent(),e))}ki(e){return So(e).get("owner").next(e=>{if(null!==e&&this.Ci(e.leaseTimestampMs,5e3)&&!this.Mi(e.ownerId)&&!this.Si(e)&&!(this.ai||this.allowTabSynchronization&&e.allowTabSynchronization))throw new T(E.FAILED_PRECONDITION,To)})}wi(e){const t={ownerId:this.clientId,allowTabSynchronization:this.allowTabSynchronization,leaseTimestampMs:Date.now()};return So(e).put("owner",t)}static D(){return ie.D()}yi(e){const t=So(e);return t.get("owner").next(e=>this.Si(e)?(g("IndexedDbPersistence","Releasing primary lease."),t.delete("owner")):re.resolve())}Ci(e,t){const n=Date.now();return!(e<n-t)&&(!(e>n)||(p(`Detected an update time that is in the future: ${e} > ${n}`),!1))}Ri(){null!==this.document&&"function"==typeof this.document.addEventListener&&(this.li=()=>{this.oi.enqueueAndForget(()=>(this.inForeground="visible"===this.document.visibilityState,this.Ai()))},this.document.addEventListener("visibilitychange",this.li),this.inForeground="visible"===this.document.visibilityState)}Oi(){this.li&&(this.document.removeEventListener("visibilitychange",this.li),this.li=null)}Vi(){var e;"function"==typeof(null===(e=this.window)||void 0===e?void 0:e.addEventListener)&&(this.ci=()=>{this.xi();const e=/(?:Version|Mobile)\/1[456]/;Object(a["z"])()&&(navigator.appVersion.match(e)||navigator.userAgent.match(e))&&this.oi.enterRestrictedMode(!0),this.oi.enqueueAndForget(()=>this.shutdown())},this.window.addEventListener("pagehide",this.ci))}Ni(){this.ci&&(this.window.removeEventListener("pagehide",this.ci),this.ci=null)}Mi(e){var t;try{const n=null!==(null===(t=this.di)||void 0===t?void 0:t.getItem(this.Fi(e)));return g("IndexedDbPersistence",`Client '${e}' ${n?"is":"is not"} zombied in LocalStorage`),n}catch(e){return p("IndexedDbPersistence","Failed to get zombied client id.",e),!1}}xi(){if(this.di)try{this.di.setItem(this.Fi(this.clientId),String(Date.now()))}catch(e){p("Failed to set zombie client id.",e)}}Li(){if(this.di)try{this.di.removeItem(this.Fi(this.clientId))}catch(e){}}Fi(e){return`firestore_zombie_${this.persistenceKey}_${e}`}}function So(e){return We(e,"owner")}function xo(e){return We(e,"clientMetadata")}function Co(e,t){let n=e.projectId;return e.isDefaultDatabase||(n+="."+e.database),"firestore/"+t+"/"+n+"/"
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class Do{constructor(e,t,n,r){this.targetId=e,this.fromCache=t,this.qi=n,this.Qi=r}static Ki(e,t){let n=Hn(),r=Hn();for(const s of t.docChanges)switch(s.type){case 0:n=n.add(s.doc.key);break;case 1:r=r.add(s.doc.key)}return new Do(e,t.fromCache,n,r)}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ko{constructor(){this._documentReadCount=0}get documentReadCount(){return this._documentReadCount}incrementDocumentReadCount(e){this._documentReadCount+=e}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class No{constructor(){this.$i=!1,this.Ui=!1,this.Wi=100,this.Gi=function(){return Object(a["z"])()?8:oe(Object(a["r"])())>0?6:4}()}initialize(e,t){this.zi=e,this.indexManager=t,this.$i=!0}getDocumentsMatchingQuery(e,t,n,r){const s={result:null};return this.ji(e,t).next(e=>{s.result=e}).next(()=>{if(!s.result)return this.Hi(e,t,r,n).next(e=>{s.result=e})}).next(()=>{if(s.result)return;const n=new ko;return this.Ji(e,t,n).next(r=>{if(s.result=r,this.Ui)return this.Yi(e,t,n,r.size)})}).next(()=>s.result)}Yi(e,t,n,r){return n.documentReadCount<this.Wi?(m()<=o["a"].DEBUG&&g("QueryEngine","SDK will not create cache indexes for query:",Mn(t),"since it only creates cache indexes for collection contains","more than or equal to",this.Wi,"documents"),re.resolve()):(m()<=o["a"].DEBUG&&g("QueryEngine","Query:",Mn(t),"scans",n.documentReadCount,"local documents and returns",r,"documents as results."),n.documentReadCount>this.Gi*r?(m()<=o["a"].DEBUG&&g("QueryEngine","The SDK decides to create cache indexes for query:",Mn(t),"as using cache indexes may help improve performance."),this.indexManager.createTargetIndexes(e,xn(t))):re.resolve())}ji(e,t){if(Tn(t))return re.resolve(null);let n=xn(t);return this.indexManager.getIndexType(e,n).next(r=>0===r?null:(null!==t.limit&&1===r&&(t=kn(t,null,"F"),n=xn(t)),this.indexManager.getDocumentsMatchingTarget(e,n).next(r=>{const s=Hn(...r);return this.zi.getDocuments(e,s).next(r=>this.indexManager.getMinOffset(e,n).next(n=>{const i=this.Zi(t,r);return this.Xi(t,i,s,n.readTime)?this.ji(e,kn(t,null,"F")):this.es(e,i,t,n)}))})))}Hi(e,t,n,r){return Tn(t)||r.isEqual(U.min())?re.resolve(null):this.zi.getDocuments(e,n).next(s=>{const i=this.Zi(t,s);return this.Xi(t,i,n,r)?re.resolve(null):(m()<=o["a"].DEBUG&&g("QueryEngine","Re-using previous result from %s to execute query: %s",r.toString(),Mn(t)),this.es(e,i,t,J(r,-1)).next(e=>e))})}Zi(e,t){let n=new nt(On(e));return t.forEach((t,r)=>{Rn(e,r)&&(n=n.add(r))}),n}Xi(e,t,n,r){if(null===e.limit)return!1;if(n.size!==t.size)return!0;const s="F"===e.limitType?t.last():t.first();return!!s&&(s.hasPendingWrites||s.version.compareTo(r)>0)}Ji(e,t,n){return m()<=o["a"].DEBUG&&g("QueryEngine","Using full collection scan to execute query:",Mn(t)),this.zi.getDocumentsMatchingQuery(e,t,X.min(),n)}es(e,t,n,r){return this.zi.getDocumentsMatchingQuery(e,n,r).next(e=>(t.forEach(t=>{e=e.insert(t.key,t)}),e))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ao{constructor(e,t,n,r){this.persistence=e,this.ts=t,this.serializer=r,this.ns=new Ze(O),this.rs=new Ln(e=>mn(e),gn),this.ss=new Map,this.os=e.getRemoteDocumentCache(),this.Qr=e.getTargetCache(),this.$r=e.getBundleCache(),this._s(n)}_s(e){this.documentOverlayCache=this.persistence.getDocumentOverlayCache(e),this.indexManager=this.persistence.getIndexManager(e),this.mutationQueue=this.persistence.getMutationQueue(e,this.indexManager),this.localDocuments=new uo(this.os,this.mutationQueue,this.documentOverlayCache,this.indexManager),this.os.setIndexManager(this.indexManager),this.ts.initialize(this.localDocuments,this.indexManager)}collectGarbage(e){return this.persistence.runTransaction("Collect garbage","readwrite-primary",t=>e.collect(t,this.ns))}}function Mo(e,t,n,r){return new Ao(e,t,n,r)}async function Ro(e,t){const n=b(e);return await n.persistence.runTransaction("Handle user change","readonly",e=>{let r;return n.mutationQueue.getAllMutationBatches(e).next(s=>(r=s,n._s(t),n.mutationQueue.getAllMutationBatches(e))).next(t=>{const s=[],i=[];let o=Hn();for(const e of r){s.push(e.batchId);for(const t of e.mutations)o=o.add(t.key)}for(const e of t){i.push(e.batchId);for(const t of e.mutations)o=o.add(t.key)}return n.localDocuments.getDocuments(e,o).next(e=>({us:e,removedBatchIds:s,addedBatchIds:i}))})})}function Vo(e,t){const n=b(e);return n.persistence.runTransaction("Acknowledge batch","readwrite-primary",e=>{const r=t.batch.keys(),s=n.os.newChangeBuffer({trackRemovals:!0});return function(e,t,n,r){const s=n.batch,i=s.keys();let o=re.resolve();return i.forEach(e=>{o=o.next(()=>r.getEntry(t,e)).next(t=>{const i=n.docVersions.get(e);I(null!==i),t.version.compareTo(i)<0&&(s.applyToRemoteDocument(t,n),t.isValidDocument()&&(t.setReadTime(n.commitVersion),r.addEntry(t)))})}),o.next(()=>e.mutationQueue.removeMutationBatch(t,s))}(n,e,t,s).next(()=>s.apply(e)).next(()=>n.mutationQueue.performConsistencyCheck(e)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(e,r,t.batch.batchId)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e,function(e){let t=Hn();for(let n=0;n<e.mutationResults.length;++n)e.mutationResults[n].transformResults.length>0&&(t=t.add(e.batch.mutations[n].key));return t}(t))).next(()=>n.localDocuments.getDocuments(e,r))})}function Oo(e){const t=b(e);return t.persistence.runTransaction("Get last remote snapshot version","readonly",e=>t.Qr.getLastRemoteSnapshotVersion(e))}function Fo(e,t){const n=b(e),r=t.snapshotVersion;let s=n.ns;return n.persistence.runTransaction("Apply remote event","readwrite-primary",e=>{const i=n.os.newChangeBuffer({trackRemovals:!0});s=n.ns;const o=[];t.targetChanges.forEach((i,a)=>{const u=s.get(a);if(!u)return;o.push(n.Qr.removeMatchingKeys(e,i.removedDocuments,a).next(()=>n.Qr.addMatchingKeys(e,i.addedDocuments,a)));let c=u.withSequenceNumber(e.currentSequenceNumber);null!==t.targetMismatches.get(a)?c=c.withResumeToken(at.EMPTY_BYTE_STRING,U.min()).withLastLimboFreeSnapshotVersion(U.min()):i.resumeToken.approximateByteSize()>0&&(c=c.withResumeToken(i.resumeToken,r)),s=s.insert(a,c),function(e,t,n){return 0===e.resumeToken.approximateByteSize()||(t.snapshotVersion.toMicroseconds()-e.snapshotVersion.toMicroseconds()>=3e8||n.addedDocuments.size+n.modifiedDocuments.size+n.removedDocuments.size>0)}(u,c,i)&&o.push(n.Qr.updateTargetData(e,c))});let a=Un(),u=Hn();if(t.documentUpdates.forEach(r=>{t.resolvedLimboDocuments.has(r)&&o.push(n.persistence.referenceDelegate.updateLimboDocument(e,r))}),o.push(Lo(e,i,t.documentUpdates).next(e=>{a=e.cs,u=e.ls})),!r.isEqual(U.min())){const t=n.Qr.getLastRemoteSnapshotVersion(e).next(t=>n.Qr.setTargetsMetadata(e,e.currentSequenceNumber,r));o.push(t)}return re.waitFor(o).next(()=>i.apply(e)).next(()=>n.localDocuments.getLocalViewOfDocuments(e,a,u)).next(()=>a)}).then(e=>(n.ns=s,e))}function Lo(e,t,n){let r=Hn(),s=Hn();return n.forEach(e=>r=r.add(e)),t.getEntries(e,r).next(e=>{let r=Un();return n.forEach((n,i)=>{const o=e.get(n);i.isFoundDocument()!==o.isFoundDocument()&&(s=s.add(n)),i.isNoDocument()&&i.version.isEqual(U.min())?(t.removeEntry(n,i.readTime),r=r.insert(n,i)):!o.isValidDocument()||i.version.compareTo(o.version)>0||0===i.version.compareTo(o.version)&&o.hasPendingWrites?(t.addEntry(i),r=r.insert(n,i)):g("LocalStore","Ignoring outdated watch update for ",n,". Current version:",o.version," Watch version:",i.version)}),{cs:r,ls:s}})}function Po(e,t){const n=b(e);return n.persistence.runTransaction("Get next mutation batch","readonly",e=>(void 0===t&&(t=-1),n.mutationQueue.getNextMutationBatchAfterBatchId(e,t)))}function Uo(e,t){const n=b(e);return n.persistence.runTransaction("Allocate target","readwrite",e=>{let r;return n.Qr.getTargetData(e,t).next(s=>s?(r=s,re.resolve(r)):n.Qr.allocateTargetId(e).next(s=>(r=new Ls(t,s,"TargetPurposeListen",e.currentSequenceNumber),n.Qr.addTargetData(e,r).next(()=>r))))}).then(e=>{const r=n.ns.get(e.targetId);return(null===r||e.snapshotVersion.compareTo(r.snapshotVersion)>0)&&(n.ns=n.ns.insert(e.targetId,e),n.rs.set(t,e.targetId)),e})}async function qo(e,t,n){const r=b(e),s=r.ns.get(t),i=n?"readwrite":"readwrite-primary";try{n||await r.persistence.runTransaction("Release target",i,e=>r.persistence.referenceDelegate.removeTarget(e,s))}catch(e){if(!ce(e))throw e;g("LocalStore",`Failed to update sequence numbers for target ${t}: ${e}`)}r.ns=r.ns.remove(t),r.rs.delete(s.target)}function Bo(e,t,n){const r=b(e);let s=U.min(),i=Hn();return r.persistence.runTransaction("Execute query","readwrite",e=>function(e,t,n){const r=b(e),s=r.rs.get(n);return void 0!==s?re.resolve(r.ns.get(s)):r.Qr.getTargetData(t,n)}(r,e,xn(t)).next(t=>{if(t)return s=t.lastLimboFreeSnapshotVersion,r.Qr.getMatchingKeysForTargetId(e,t.targetId).next(e=>{i=e})}).next(()=>r.ts.getDocumentsMatchingQuery(e,t,n?s:U.min(),n?i:Hn())).next(e=>(Ko(r,Vn(t),e),{documents:e,hs:i})))}function zo(e,t){const n=b(e),r=b(n.Qr),s=n.ns.get(t);return s?Promise.resolve(s.target):n.persistence.runTransaction("Get target data","readonly",e=>r.ot(e,t).next(e=>e?e.target:null))}function Go(e,t){const n=b(e),r=n.ss.get(t)||U.min();return n.persistence.runTransaction("Get new document changes","readonly",e=>n.os.getAllFromCollectionGroup(e,t,J(r,-1),Number.MAX_SAFE_INTEGER)).then(e=>(Ko(n,t,e),e))}function Ko(e,t,n){let r=e.ss.get(t)||U.min();n.forEach((e,t)=>{t.readTime.compareTo(r)>0&&(r=t.readTime)}),e.ss.set(t,r)}function jo(e,t){return`firestore_clients_${e}_${t}`}function $o(e,t,n){let r=`firestore_mutations_${e}_${n}`;return t.isAuthenticated()&&(r+="_"+t.uid),r}function Qo(e,t){return`firestore_targets_${e}_${t}`}class Ho{constructor(e,t,n,r){this.user=e,this.batchId=t,this.state=n,this.error=r}static Es(e,t,n){const r=JSON.parse(n);let s,i="object"==typeof r&&-1!==["pending","acknowledged","rejected"].indexOf(r.state)&&(void 0===r.error||"object"==typeof r.error);return i&&r.error&&(i="string"==typeof r.error.message&&"string"==typeof r.error.code,i&&(s=new T(r.error.code,r.error.message))),i?new Ho(e,t,r.state,s):(p("SharedClientState",`Failed to parse mutation state for ID '${t}': ${n}`),null)}ds(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Wo{constructor(e,t,n){this.targetId=e,this.state=t,this.error=n}static Es(e,t){const n=JSON.parse(t);let r,s="object"==typeof n&&-1!==["not-current","current","rejected"].indexOf(n.state)&&(void 0===n.error||"object"==typeof n.error);return s&&n.error&&(s="string"==typeof n.error.message&&"string"==typeof n.error.code,s&&(r=new T(n.error.code,n.error.message))),s?new Wo(e,n.state,r):(p("SharedClientState",`Failed to parse target state for ID '${e}': ${t}`),null)}ds(){const e={state:this.state,updateTimeMs:Date.now()};return this.error&&(e.error={code:this.error.code,message:this.error.message}),JSON.stringify(e)}}class Jo{constructor(e,t){this.clientId=e,this.activeTargetIds=t}static Es(e,t){const n=JSON.parse(t);let r="object"==typeof n&&n.activeTargetIds instanceof Array,s=Jn();for(let i=0;r&&i<n.activeTargetIds.length;++i)r=ve(n.activeTargetIds[i]),s=s.add(n.activeTargetIds[i]);return r?new Jo(e,s):(p("SharedClientState",`Failed to parse client data for instance '${e}': ${t}`),null)}}class Yo{constructor(e,t){this.clientId=e,this.onlineState=t}static Es(e){const t=JSON.parse(e);return"object"==typeof t&&-1!==["Unknown","Online","Offline"].indexOf(t.onlineState)&&"string"==typeof t.clientId?new Yo(t.clientId,t.onlineState):(p("SharedClientState","Failed to parse online state: "+e),null)}}class Xo{constructor(){this.activeTargetIds=Jn()}As(e){this.activeTargetIds=this.activeTargetIds.add(e)}Rs(e){this.activeTargetIds=this.activeTargetIds.delete(e)}ds(){const e={activeTargetIds:this.activeTargetIds.toArray(),updateTimeMs:Date.now()};return JSON.stringify(e)}}class Zo{constructor(e,t,n,r,s){this.window=e,this.oi=t,this.persistenceKey=n,this.Vs=r,this.syncEngine=null,this.onlineStateHandler=null,this.sequenceNumberHandler=null,this.fs=this.gs.bind(this),this.ps=new Ze(O),this.started=!1,this.ys=[];const i=n.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");this.storage=this.window.localStorage,this.currentUser=s,this.ws=jo(this.persistenceKey,this.Vs),this.Ss=function(e){return"firestore_sequence_number_"+e}
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(this.persistenceKey),this.ps=this.ps.insert(this.Vs,new Xo),this.bs=new RegExp(`^firestore_clients_${i}_([^_]*)$`),this.Ds=new RegExp(`^firestore_mutations_${i}_(\\d+)(?:_(.*))?$`),this.Cs=new RegExp(`^firestore_targets_${i}_(\\d+)$`),this.vs=function(e){return"firestore_online_state_"+e}(this.persistenceKey),this.Fs=function(e){return"firestore_bundle_loaded_v2_"+e}(this.persistenceKey),this.window.addEventListener("storage",this.fs)}static D(e){return!(!e||!e.localStorage)}async start(){const e=await this.syncEngine.Bi();for(const n of e){if(n===this.Vs)continue;const e=this.getItem(jo(this.persistenceKey,n));if(e){const t=Jo.Es(n,e);t&&(this.ps=this.ps.insert(t.clientId,t))}}this.Ms();const t=this.storage.getItem(this.vs);if(t){const e=this.xs(t);e&&this.Os(e)}for(const n of this.ys)this.gs(n);this.ys=[],this.window.addEventListener("pagehide",()=>this.shutdown()),this.started=!0}writeSequenceNumber(e){this.setItem(this.Ss,JSON.stringify(e))}getAllActiveQueryTargets(){return this.Ns(this.ps)}isActiveQueryTarget(e){let t=!1;return this.ps.forEach((n,r)=>{r.activeTargetIds.has(e)&&(t=!0)}),t}addPendingMutation(e){this.Ls(e,"pending")}updateMutationState(e,t,n){this.Ls(e,t,n),this.Bs(e)}addLocalQueryTarget(e){let t="not-current";if(this.isActiveQueryTarget(e)){const n=this.storage.getItem(Qo(this.persistenceKey,e));if(n){const r=Wo.Es(e,n);r&&(t=r.state)}}return this.ks.As(e),this.Ms(),t}removeLocalQueryTarget(e){this.ks.Rs(e),this.Ms()}isLocalQueryTarget(e){return this.ks.activeTargetIds.has(e)}clearQueryState(e){this.removeItem(Qo(this.persistenceKey,e))}updateQueryState(e,t,n){this.qs(e,t,n)}handleUserChange(e,t,n){t.forEach(e=>{this.Bs(e)}),this.currentUser=e,n.forEach(e=>{this.addPendingMutation(e)})}setOnlineState(e){this.Qs(e)}notifyBundleLoaded(e){this.Ks(e)}shutdown(){this.started&&(this.window.removeEventListener("storage",this.fs),this.removeItem(this.ws),this.started=!1)}getItem(e){const t=this.storage.getItem(e);return g("SharedClientState","READ",e,t),t}setItem(e,t){g("SharedClientState","SET",e,t),this.storage.setItem(e,t)}removeItem(e){g("SharedClientState","REMOVE",e),this.storage.removeItem(e)}gs(e){const t=e;if(t.storageArea===this.storage){if(g("SharedClientState","EVENT",t.key,t.newValue),t.key===this.ws)return void p("Received WebStorage notification for local change. Another client might have garbage-collected our state");this.oi.enqueueRetryable(async()=>{if(this.started){if(null!==t.key)if(this.bs.test(t.key)){if(null==t.newValue){const e=this.$s(t.key);return this.Us(e,null)}{const e=this.Ws(t.key,t.newValue);if(e)return this.Us(e.clientId,e)}}else if(this.Ds.test(t.key)){if(null!==t.newValue){const e=this.Gs(t.key,t.newValue);if(e)return this.zs(e)}}else if(this.Cs.test(t.key)){if(null!==t.newValue){const e=this.js(t.key,t.newValue);if(e)return this.Hs(e)}}else if(t.key===this.vs){if(null!==t.newValue){const e=this.xs(t.newValue);if(e)return this.Os(e)}}else if(t.key===this.Ss){const e=function(e){let t=pe.oe;if(null!=e)try{const n=JSON.parse(e);I("number"==typeof n),t=n}catch(e){p("SharedClientState","Failed to read sequence number from WebStorage",e)}return t}(t.newValue);e!==pe.oe&&this.sequenceNumberHandler(e)}else if(t.key===this.Fs){const e=this.Js(t.newValue);await Promise.all(e.map(e=>this.syncEngine.Ys(e)))}}else this.ys.push(t)})}}get ks(){return this.ps.get(this.Vs)}Ms(){this.setItem(this.ws,this.ks.ds())}Ls(e,t,n){const r=new Ho(this.currentUser,e,t,n),s=$o(this.persistenceKey,this.currentUser,e);this.setItem(s,r.ds())}Bs(e){const t=$o(this.persistenceKey,this.currentUser,e);this.removeItem(t)}Qs(e){const t={clientId:this.Vs,onlineState:e};this.storage.setItem(this.vs,JSON.stringify(t))}qs(e,t,n){const r=Qo(this.persistenceKey,e),s=new Wo(e,t,n);this.setItem(r,s.ds())}Ks(e){const t=JSON.stringify(Array.from(e));this.setItem(this.Fs,t)}$s(e){const t=this.bs.exec(e);return t?t[1]:null}Ws(e,t){const n=this.$s(e);return Jo.Es(n,t)}Gs(e,t){const n=this.Ds.exec(e),r=Number(n[1]),s=void 0!==n[2]?n[2]:null;return Ho.Es(new h(s),r,t)}js(e,t){const n=this.Cs.exec(e),r=Number(n[1]);return Wo.Es(r,t)}xs(e){return Yo.Es(e)}Js(e){return JSON.parse(e)}async zs(e){if(e.user.uid===this.currentUser.uid)return this.syncEngine.Zs(e.batchId,e.state,e.error);g("SharedClientState","Ignoring mutation for non-active user "+e.user.uid)}Hs(e){return this.syncEngine.Xs(e.targetId,e.state,e.error)}Us(e,t){const n=t?this.ps.insert(e,t):this.ps.remove(e),r=this.Ns(this.ps),s=this.Ns(n),i=[],o=[];return s.forEach(e=>{r.has(e)||i.push(e)}),r.forEach(e=>{s.has(e)||o.push(e)}),this.syncEngine.eo(i,o).then(()=>{this.ps=n})}Os(e){this.ps.get(e.clientId)&&this.onlineStateHandler(e.onlineState)}Ns(e){let t=Jn();return e.forEach((e,n)=>{t=t.unionWith(n.activeTargetIds)}),t}}class ea{constructor(){this.no=new Xo,this.ro={},this.onlineStateHandler=null,this.sequenceNumberHandler=null}addPendingMutation(e){}updateMutationState(e,t,n){}addLocalQueryTarget(e){return this.no.As(e),this.ro[e]||"not-current"}updateQueryState(e,t,n){this.ro[e]=t}removeLocalQueryTarget(e){this.no.Rs(e)}isLocalQueryTarget(e){return this.no.activeTargetIds.has(e)}clearQueryState(e){delete this.ro[e]}getAllActiveQueryTargets(){return this.no.activeTargetIds}isActiveQueryTarget(e){return this.no.activeTargetIds.has(e)}start(){return this.no=new Xo,Promise.resolve()}handleUserChange(e,t,n){}setOnlineState(e){}shutdown(){}writeSequenceNumber(e){}notifyBundleLoaded(e){}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class ta{io(e){}shutdown(){}}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class na{constructor(){this.so=()=>this.oo(),this._o=()=>this.ao(),this.uo=[],this.co()}io(e){this.uo.push(e)}shutdown(){window.removeEventListener("online",this.so),window.removeEventListener("offline",this._o)}co(){window.addEventListener("online",this.so),window.addEventListener("offline",this._o)}oo(){g("ConnectivityMonitor","Network connectivity changed: AVAILABLE");for(const e of this.uo)e(0)}ao(){g("ConnectivityMonitor","Network connectivity changed: UNAVAILABLE");for(const e of this.uo)e(1)}static D(){return"undefined"!=typeof window&&void 0!==window.addEventListener&&void 0!==window.removeEventListener}}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */let ra=null;function sa(){return null===ra?ra=function(){return 268435456+Math.round(2147483648*Math.random())}():ra++,"0x"+ra.toString(16)
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}const ia={BatchGetDocuments:"batchGet",Commit:"commit",RunQuery:"runQuery",RunAggregationQuery:"runAggregationQuery"};
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class oa{constructor(e){this.lo=e.lo,this.ho=e.ho}Po(e){this.Io=e}To(e){this.Eo=e}Ao(e){this.Ro=e}onMessage(e){this.Vo=e}close(){this.ho()}send(e){this.lo(e)}mo(){this.Io()}fo(){this.Eo()}po(e){this.Ro(e)}yo(e){this.Vo(e)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const aa="WebChannelConnection";class ua extends class{constructor(e){this.databaseInfo=e,this.databaseId=e.databaseId;const t=e.ssl?"https":"http",n=encodeURIComponent(this.databaseId.projectId),r=encodeURIComponent(this.databaseId.database);this.wo=t+"://"+e.host,this.So=`projects/${n}/databases/${r}`,this.bo="(default)"===this.databaseId.database?"project_id="+n:`project_id=${n}&database_id=${r}`}get Do(){return!1}Co(e,t,n,r,s){const i=sa(),o=this.vo(e,t.toUriEncodedString());g("RestConnection",`Sending RPC '${e}' ${i}:`,o,n);const a={"google-cloud-resource-prefix":this.So,"x-goog-request-params":this.bo};return this.Fo(a,r,s),this.Mo(e,o,a,n).then(t=>(g("RestConnection",`Received RPC '${e}' ${i}: `,t),t),t=>{throw y("RestConnection",`RPC '${e}' ${i} failed with error: `,t,"url: ",o,"request:",n),t})}xo(e,t,n,r,s,i){return this.Co(e,t,n,r,s)}Fo(e,t,n){e["X-Goog-Api-Client"]=function(){return"gl-js/ fire/"+d}(),e["Content-Type"]="text/plain",this.databaseInfo.appId&&(e["X-Firebase-GMPID"]=this.databaseInfo.appId),t&&t.headers.forEach((t,n)=>e[n]=t),n&&n.headers.forEach((t,n)=>e[n]=t)}vo(e,t){const n=ia[e];return`${this.wo}/v1/${t}:${n}`}terminate(){}}{constructor(e){super(e),this.forceLongPolling=e.forceLongPolling,this.autoDetectLongPolling=e.autoDetectLongPolling,this.useFetchStreams=e.useFetchStreams,this.longPollingOptions=e.longPollingOptions}Mo(e,t,n,r){const s=sa();return new Promise((i,o)=>{const a=new c["g"];a.setWithCredentials(!0),a.listenOnce(c["c"].COMPLETE,()=>{try{switch(a.getLastErrorCode()){case c["a"].NO_ERROR:const t=a.getResponseJson();g(aa,`XHR for RPC '${e}' ${s} received:`,JSON.stringify(t)),i(t);break;case c["a"].TIMEOUT:g(aa,`RPC '${e}' ${s} timed out`),o(new T(E.DEADLINE_EXCEEDED,"Request time out"));break;case c["a"].HTTP_ERROR:const n=a.getStatus();if(g(aa,`RPC '${e}' ${s} failed with status:`,n,"response text:",a.getResponseText()),n>0){let e=a.getResponseJson();Array.isArray(e)&&(e=e[0]);const t=null==e?void 0:e.error;if(t&&t.status&&t.message){const e=function(e){const t=e.toLowerCase().replace(/_/g,"-");return Object.values(E).indexOf(t)>=0?t:E.UNKNOWN}(t.status);o(new T(e,t.message))}else o(new T(E.UNKNOWN,"Server responded with status "+a.getStatus()))}else o(new T(E.UNAVAILABLE,"Connection failed."));break;default:v()}}finally{g(aa,`RPC '${e}' ${s} completed.`)}});const u=JSON.stringify(r);g(aa,`RPC '${e}' ${s} sending request:`,r),a.send(t,"POST",u,n,15)})}Oo(e,t,n){const r=sa(),s=[this.wo,"/","google.firestore.v1.Firestore","/",e,"/channel"],i=Object(c["h"])(),o=Object(c["i"])(),a={httpSessionIdParam:"gsessionid",initMessageHeaders:{},messageUrlParams:{database:`projects/${this.databaseId.projectId}/databases/${this.databaseId.database}`},sendRawJson:!0,supportsCrossDomainXhr:!0,internalChannelParams:{forwardChannelRequestTimeoutMs:6e5},forceLongPolling:this.forceLongPolling,detectBufferingProxy:this.autoDetectLongPolling},u=this.longPollingOptions.timeoutSeconds;void 0!==u&&(a.longPollingTimeout=Math.round(1e3*u)),this.useFetchStreams&&(a.xmlHttpFactory=new c["d"]({})),this.Fo(a.initMessageHeaders,t,n),a.encodeInitMessageHeaders=!0;const l=s.join("");g(aa,`Creating RPC '${e}' stream ${r}: ${l}`,a);const h=i.createWebChannel(l,a);let d=!1,f=!1;const m=new oa({lo:t=>{f?g(aa,`Not sending because RPC '${e}' stream ${r} is closed:`,t):(d||(g(aa,`Opening RPC '${e}' stream ${r} transport.`),h.open(),d=!0),g(aa,`RPC '${e}' stream ${r} sending:`,t),h.send(t))},ho:()=>h.close()}),p=(e,t,n)=>{e.listen(t,e=>{try{n(e)}catch(e){setTimeout(()=>{throw e},0)}})};return p(h,c["f"].EventType.OPEN,()=>{f||(g(aa,`RPC '${e}' stream ${r} transport opened.`),m.mo())}),p(h,c["f"].EventType.CLOSE,()=>{f||(f=!0,g(aa,`RPC '${e}' stream ${r} transport closed`),m.po())}),p(h,c["f"].EventType.ERROR,t=>{f||(f=!0,y(aa,`RPC '${e}' stream ${r} transport errored:`,t),m.po(new T(E.UNAVAILABLE,"The operation could not be completed")))}),p(h,c["f"].EventType.MESSAGE,t=>{var n;if(!f){const s=t.data[0];I(!!s);const i=s,o=i.error||(null===(n=i[0])||void 0===n?void 0:n.error);if(o){g(aa,`RPC '${e}' stream ${r} received error:`,o);const t=o.status;let n=function(e){const t=Vr[e];if(void 0!==t)return Lr(t)}(t),s=o.message;void 0===n&&(n=E.INTERNAL,s="Unknown error status: "+t+" with message "+o.message),f=!0,m.po(new T(n,s)),h.close()}else g(aa,`RPC '${e}' stream ${r} received:`,s),m.yo(s)}}),p(o,c["b"].STAT_EVENT,t=>{t.stat===c["e"].PROXY?g(aa,`RPC '${e}' stream ${r} detected buffering proxy`):t.stat===c["e"].NOPROXY&&g(aa,`RPC '${e}' stream ${r} detected no buffering proxy`)}),setTimeout(()=>{m.fo()},0),m}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ca(){return"undefined"!=typeof window?window:null}function la(){return"undefined"!=typeof document?document:null}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ha(e){return new rs(e,!0)}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class da{constructor(e,t,n=1e3,r=1.5,s=6e4){this.oi=e,this.timerId=t,this.No=n,this.Lo=r,this.Bo=s,this.ko=0,this.qo=null,this.Qo=Date.now(),this.reset()}reset(){this.ko=0}Ko(){this.ko=this.Bo}$o(e){this.cancel();const t=Math.floor(this.ko+this.Uo()),n=Math.max(0,Date.now()-this.Qo),r=Math.max(0,t-n);r>0&&g("ExponentialBackoff",`Backing off for ${r} ms (base delay: ${this.ko} ms, delay with jitter: ${t} ms, last attempt: ${n} ms ago)`),this.qo=this.oi.enqueueAfterDelay(this.timerId,r,()=>(this.Qo=Date.now(),e())),this.ko*=this.Lo,this.ko<this.No&&(this.ko=this.No),this.ko>this.Bo&&(this.ko=this.Bo)}Wo(){null!==this.qo&&(this.qo.skipDelay(),this.qo=null)}cancel(){null!==this.qo&&(this.qo.cancel(),this.qo=null)}Uo(){return(Math.random()-.5)*this.ko}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class fa{constructor(e,t,n,r,s,i,o,a){this.oi=e,this.Go=n,this.zo=r,this.connection=s,this.authCredentialsProvider=i,this.appCheckCredentialsProvider=o,this.listener=a,this.state=0,this.jo=0,this.Ho=null,this.Jo=null,this.stream=null,this.Yo=new da(e,t)}Zo(){return 1===this.state||5===this.state||this.Xo()}Xo(){return 2===this.state||3===this.state}start(){4!==this.state?this.auth():this.e_()}async stop(){this.Zo()&&await this.close(0)}t_(){this.state=0,this.Yo.reset()}n_(){this.Xo()&&null===this.Ho&&(this.Ho=this.oi.enqueueAfterDelay(this.Go,6e4,()=>this.r_()))}i_(e){this.s_(),this.stream.send(e)}async r_(){if(this.Xo())return this.close(0)}s_(){this.Ho&&(this.Ho.cancel(),this.Ho=null)}o_(){this.Jo&&(this.Jo.cancel(),this.Jo=null)}async close(e,t){this.s_(),this.o_(),this.Yo.cancel(),this.jo++,4!==e?this.Yo.reset():t&&t.code===E.RESOURCE_EXHAUSTED?(p(t.toString()),p("Using maximum backoff delay to prevent overloading the backend."),this.Yo.Ko()):t&&t.code===E.UNAUTHENTICATED&&3!==this.state&&(this.authCredentialsProvider.invalidateToken(),this.appCheckCredentialsProvider.invalidateToken()),null!==this.stream&&(this.__(),this.stream.close(),this.stream=null),this.state=e,await this.listener.Ao(t)}__(){}auth(){this.state=1;const e=this.a_(this.jo),t=this.jo;Promise.all([this.authCredentialsProvider.getToken(),this.appCheckCredentialsProvider.getToken()]).then(([e,n])=>{this.jo===t&&this.u_(e,n)},t=>{e(()=>{const e=new T(E.UNKNOWN,"Fetching auth token failed: "+t.message);return this.c_(e)})})}u_(e,t){const n=this.a_(this.jo);this.stream=this.l_(e,t),this.stream.Po(()=>{n(()=>this.listener.Po())}),this.stream.To(()=>{n(()=>(this.state=2,this.Jo=this.oi.enqueueAfterDelay(this.zo,1e4,()=>(this.Xo()&&(this.state=3),Promise.resolve())),this.listener.To()))}),this.stream.Ao(e=>{n(()=>this.c_(e))}),this.stream.onMessage(e=>{n(()=>this.onMessage(e))})}e_(){this.state=5,this.Yo.$o(async()=>{this.state=0,this.start()})}c_(e){return g("PersistentStream","close with error: "+e),this.stream=null,this.close(4,e)}a_(e){return t=>{this.oi.enqueueAndForget(()=>this.jo===e?t():(g("PersistentStream","stream callback skipped by getCloseGuardedDispatcher."),Promise.resolve()))}}}class ma extends fa{constructor(e,t,n,r,s,i){super(e,"listen_stream_connection_backoff","listen_stream_idle","health_check_timeout",t,n,r,i),this.serializer=s}l_(e,t){return this.connection.Oo("Listen",e,t)}onMessage(e){this.Yo.reset();const t=Is(this.serializer,e),n=function(e){if(!("targetChange"in e))return U.min();const t=e.targetChange;return t.targetIds&&t.targetIds.length?U.min():t.readTime?us(t.readTime):U.min()}(e);return this.listener.h_(t,n)}P_(e){const t={};t.database=ps(this.serializer),t.addTarget=function(e,t){let n;const r=t.target;if(n=pn(r)?{documents:_s(e,r)}:{query:Ss(e,r)._t},n.targetId=t.targetId,t.resumeToken.approximateByteSize()>0){n.resumeToken=os(e,t.resumeToken);const r=ss(e,t.expectedCount);null!==r&&(n.expectedCount=r)}else if(t.snapshotVersion.compareTo(U.min())>0){n.readTime=is(e,t.snapshotVersion.toTimestamp());const r=ss(e,t.expectedCount);null!==r&&(n.expectedCount=r)}return n}(this.serializer,e);const n=Cs(this.serializer,e);n&&(t.labels=n),this.i_(t)}I_(e){const t={};t.database=ps(this.serializer),t.removeTarget=e,this.i_(t)}}class ga extends fa{constructor(e,t,n,r,s,i){super(e,"write_stream_connection_backoff","write_stream_idle","health_check_timeout",t,n,r,i),this.serializer=s,this.T_=!1}get E_(){return this.T_}start(){this.T_=!1,this.lastStreamToken=void 0,super.start()}__(){this.T_&&this.d_([])}l_(e,t){return this.connection.Oo("Write",e,t)}onMessage(e){if(I(!!e.streamToken),this.lastStreamToken=e.streamToken,this.T_){this.Yo.reset();const t=Ts(e.writeResults,e.commitTime),n=us(e.commitTime);return this.listener.A_(n,t)}return I(!e.writeResults||0===e.writeResults.length),this.T_=!0,this.listener.R_()}V_(){const e={};e.database=ps(this.serializer),this.i_(e)}d_(e){const t={streamToken:this.lastStreamToken,writes:e.map(e=>bs(this.serializer,e))};this.i_(t)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class pa extends class{}{constructor(e,t,n,r){super(),this.authCredentials=e,this.appCheckCredentials=t,this.connection=n,this.serializer=r,this.m_=!1}f_(){if(this.m_)throw new T(E.FAILED_PRECONDITION,"The client has already been terminated.")}Co(e,t,n,r){return this.f_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([s,i])=>this.connection.Co(e,ls(t,n),r,s,i)).catch(e=>{throw"FirebaseError"===e.name?(e.code===E.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),e):new T(E.UNKNOWN,e.toString())})}xo(e,t,n,r,s){return this.f_(),Promise.all([this.authCredentials.getToken(),this.appCheckCredentials.getToken()]).then(([i,o])=>this.connection.xo(e,ls(t,n),r,i,o,s)).catch(e=>{throw"FirebaseError"===e.name?(e.code===E.UNAUTHENTICATED&&(this.authCredentials.invalidateToken(),this.appCheckCredentials.invalidateToken()),e):new T(E.UNKNOWN,e.toString())})}terminate(){this.m_=!0,this.connection.terminate()}}class ya{constructor(e,t){this.asyncQueue=e,this.onlineStateHandler=t,this.state="Unknown",this.g_=0,this.p_=null,this.y_=!0}w_(){0===this.g_&&(this.S_("Unknown"),this.p_=this.asyncQueue.enqueueAfterDelay("online_state_timeout",1e4,()=>(this.p_=null,this.b_("Backend didn't respond within 10 seconds."),this.S_("Offline"),Promise.resolve())))}D_(e){"Online"===this.state?this.S_("Unknown"):(this.g_++,this.g_>=1&&(this.C_(),this.b_("Connection failed 1 times. Most recent error: "+e.toString()),this.S_("Offline")))}set(e){this.C_(),this.g_=0,"Online"===e&&(this.y_=!1),this.S_(e)}S_(e){e!==this.state&&(this.state=e,this.onlineStateHandler(e))}b_(e){const t=`Could not reach Cloud Firestore backend. ${e}\nThis typically indicates that your device does not have a healthy Internet connection at the moment. The client will operate in offline mode until it is able to successfully connect to the backend.`;this.y_?(p(t),this.y_=!1):g("OnlineStateTracker",t)}C_(){null!==this.p_&&(this.p_.cancel(),this.p_=null)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wa{constructor(e,t,n,r,s){this.localStore=e,this.datastore=t,this.asyncQueue=n,this.remoteSyncer={},this.v_=[],this.F_=new Map,this.M_=new Set,this.x_=[],this.O_=s,this.O_.io(e=>{n.enqueueAndForget(async()=>{Ca(this)&&(g("RemoteStore","Restarting streams for network reachability change."),await async function(e){const t=b(e);t.M_.add(4),await Ia(t),t.N_.set("Unknown"),t.M_.delete(4),await va(t)}(this))})}),this.N_=new ya(n,r)}}async function va(e){if(Ca(e))for(const t of e.x_)await t(!0)}async function Ia(e){for(const t of e.x_)await t(!1)}function ba(e,t){const n=b(e);n.F_.has(t.targetId)||(n.F_.set(t.targetId,t),xa(n)?Sa(n):$a(n).Xo()&&Ta(n,t))}function Ea(e,t){const n=b(e),r=$a(n);n.F_.delete(t),r.Xo()&&_a(n,t),0===n.F_.size&&(r.Xo()?r.n_():Ca(n)&&n.N_.set("Unknown"))}function Ta(e,t){if(e.L_.xe(t.targetId),t.resumeToken.approximateByteSize()>0||t.snapshotVersion.compareTo(U.min())>0){const n=e.remoteSyncer.getRemoteKeysForTarget(t.targetId).size;t=t.withExpectedCount(n)}$a(e).P_(t)}function _a(e,t){e.L_.xe(t),$a(e).I_(t)}function Sa(e){e.L_=new Yr({getRemoteKeysForTarget:t=>e.remoteSyncer.getRemoteKeysForTarget(t),ot:t=>e.F_.get(t)||null,tt:()=>e.datastore.serializer.databaseId}),$a(e).start(),e.N_.w_()}function xa(e){return Ca(e)&&!$a(e).Zo()&&e.F_.size>0}function Ca(e){return 0===b(e).M_.size}function Da(e){e.L_=void 0}async function ka(e){e.N_.set("Online")}async function Na(e){e.F_.forEach((t,n)=>{Ta(e,t)})}async function Aa(e,t){Da(e),xa(e)?(e.N_.D_(t),Sa(e)):e.N_.set("Unknown")}async function Ma(e,t,n){if(e.N_.set("Online"),t instanceof Wr&&2===t.state&&t.cause)try{await async function(e,t){const n=t.cause;for(const r of t.targetIds)e.F_.has(r)&&(await e.remoteSyncer.rejectListen(r,n),e.F_.delete(r),e.L_.removeTarget(r))}(e,t)}catch(n){g("RemoteStore","Failed to remove targets %s: %s ",t.targetIds.join(","),n),await Ra(e,n)}else if(t instanceof Qr?e.L_.Ke(t):t instanceof Hr?e.L_.He(t):e.L_.We(t),!n.isEqual(U.min()))try{const t=await Oo(e.localStore);n.compareTo(t)>=0&&await function(e,t){const n=e.L_.rt(t);return n.targetChanges.forEach((n,r)=>{if(n.resumeToken.approximateByteSize()>0){const s=e.F_.get(r);s&&e.F_.set(r,s.withResumeToken(n.resumeToken,t))}}),n.targetMismatches.forEach((t,n)=>{const r=e.F_.get(t);if(!r)return;e.F_.set(t,r.withResumeToken(at.EMPTY_BYTE_STRING,r.snapshotVersion)),_a(e,t);const s=new Ls(r.target,t,n,r.sequenceNumber);Ta(e,s)}),e.remoteSyncer.applyRemoteEvent(n)}(e,n)}catch(t){g("RemoteStore","Failed to raise snapshot:",t),await Ra(e,t)}}async function Ra(e,t,n){if(!ce(t))throw t;e.M_.add(1),await Ia(e),e.N_.set("Offline"),n||(n=()=>Oo(e.localStore)),e.asyncQueue.enqueueRetryable(async()=>{g("RemoteStore","Retrying IndexedDB access"),await n(),e.M_.delete(1),await va(e)})}function Va(e,t){return t().catch(n=>Ra(e,n,t))}async function Oa(e){const t=b(e),n=Qa(t);let r=t.v_.length>0?t.v_[t.v_.length-1].batchId:-1;for(;Fa(t);)try{const e=await Po(t.localStore,r);if(null===e){0===t.v_.length&&n.n_();break}r=e.batchId,La(t,e)}catch(e){await Ra(t,e)}Pa(t)&&Ua(t)}function Fa(e){return Ca(e)&&e.v_.length<10}function La(e,t){e.v_.push(t);const n=Qa(e);n.Xo()&&n.E_&&n.d_(t.mutations)}function Pa(e){return Ca(e)&&!Qa(e).Zo()&&e.v_.length>0}function Ua(e){Qa(e).start()}async function qa(e){Qa(e).V_()}async function Ba(e){const t=Qa(e);for(const n of e.v_)t.d_(n.mutations)}async function za(e,t,n){const r=e.v_.shift(),s=Ar.from(r,t,n);await Va(e,()=>e.remoteSyncer.applySuccessfulWrite(s)),await Oa(e)}async function Ga(e,t){t&&Qa(e).E_&&await async function(e,t){if(function(e){return Fr(e)&&e!==E.ABORTED}(t.code)){const n=e.v_.shift();Qa(e).t_(),await Va(e,()=>e.remoteSyncer.rejectFailedWrite(n.batchId,t)),await Oa(e)}}(e,t),Pa(e)&&Ua(e)}async function Ka(e,t){const n=b(e);n.asyncQueue.verifyOperationInProgress(),g("RemoteStore","RemoteStore received new credentials");const r=Ca(n);n.M_.add(3),await Ia(n),r&&n.N_.set("Unknown"),await n.remoteSyncer.handleCredentialChange(t),n.M_.delete(3),await va(n)}async function ja(e,t){const n=b(e);t?(n.M_.delete(2),await va(n)):t||(n.M_.add(2),await Ia(n),n.N_.set("Unknown"))}function $a(e){return e.B_||(e.B_=function(e,t,n){const r=b(e);return r.f_(),new ma(t,r.connection,r.authCredentials,r.appCheckCredentials,r.serializer,n)
/**
 * @license
 * Copyright 2018 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}(e.datastore,e.asyncQueue,{Po:ka.bind(null,e),To:Na.bind(null,e),Ao:Aa.bind(null,e),h_:Ma.bind(null,e)}),e.x_.push(async t=>{t?(e.B_.t_(),xa(e)?Sa(e):e.N_.set("Unknown")):(await e.B_.stop(),Da(e))})),e.B_}function Qa(e){return e.k_||(e.k_=function(e,t,n){const r=b(e);return r.f_(),new ga(t,r.connection,r.authCredentials,r.appCheckCredentials,r.serializer,n)}(e.datastore,e.asyncQueue,{Po:()=>Promise.resolve(),To:qa.bind(null,e),Ao:Ga.bind(null,e),R_:Ba.bind(null,e),A_:za.bind(null,e)}),e.x_.push(async t=>{t?(e.k_.t_(),await Oa(e)):(await e.k_.stop(),e.v_.length>0&&(g("RemoteStore",`Stopping write stream with ${e.v_.length} pending writes`),e.v_=[]))})),e.k_
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}class Ha{constructor(e,t,n,r,s){this.asyncQueue=e,this.timerId=t,this.targetTimeMs=n,this.op=r,this.removalCallback=s,this.deferred=new _,this.then=this.deferred.promise.then.bind(this.deferred.promise),this.deferred.promise.catch(e=>{})}get promise(){return this.deferred.promise}static createAndSchedule(e,t,n,r,s){const i=Date.now()+n,o=new Ha(e,t,i,r,s);return o.start(n),o}start(e){this.timerHandle=setTimeout(()=>this.handleDelayElapsed(),e)}skipDelay(){return this.handleDelayElapsed()}cancel(e){null!==this.timerHandle&&(this.clearTimeout(),this.deferred.reject(new T(E.CANCELLED,"Operation cancelled"+(e?": "+e:""))))}handleDelayElapsed(){this.asyncQueue.enqueueAndForget(()=>null!==this.timerHandle?(this.clearTimeout(),this.op().then(e=>this.deferred.resolve(e))):Promise.resolve())}clearTimeout(){null!==this.timerHandle&&(this.removalCallback(this),clearTimeout(this.timerHandle),this.timerHandle=null)}}function Wa(e,t){if(p("AsyncQueue",`${t}: ${e}`),ce(e))return new T(E.UNAVAILABLE,`${t}: ${e}`);throw e}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ja{constructor(e){this.comparator=e?(t,n)=>e(t,n)||K.comparator(t.key,n.key):(e,t)=>K.comparator(e.key,t.key),this.keyedMap=Bn(),this.sortedSet=new Ze(this.comparator)}static emptySet(e){return new Ja(e.comparator)}has(e){return null!=this.keyedMap.get(e)}get(e){return this.keyedMap.get(e)}first(){return this.sortedSet.minKey()}last(){return this.sortedSet.maxKey()}isEmpty(){return this.sortedSet.isEmpty()}indexOf(e){const t=this.keyedMap.get(e);return t?this.sortedSet.indexOf(t):-1}get size(){return this.sortedSet.size}forEach(e){this.sortedSet.inorderTraversal((t,n)=>(e(t),!1))}add(e){const t=this.delete(e.key);return t.copy(t.keyedMap.insert(e.key,e),t.sortedSet.insert(e,null))}delete(e){const t=this.get(e);return t?this.copy(this.keyedMap.remove(e),this.sortedSet.remove(t)):this}isEqual(e){if(!(e instanceof Ja))return!1;if(this.size!==e.size)return!1;const t=this.sortedSet.getIterator(),n=e.sortedSet.getIterator();for(;t.hasNext();){const e=t.getNext().key,r=n.getNext().key;if(!e.isEqual(r))return!1}return!0}toString(){const e=[];return this.forEach(t=>{e.push(t.toString())}),0===e.length?"DocumentSet ()":"DocumentSet (\n  "+e.join("  \n")+"\n)"}copy(e,t){const n=new Ja;return n.comparator=this.comparator,n.keyedMap=e,n.sortedSet=t,n}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ya{constructor(){this.q_=new Ze(K.comparator)}track(e){const t=e.doc.key,n=this.q_.get(t);n?0!==e.type&&3===n.type?this.q_=this.q_.insert(t,e):3===e.type&&1!==n.type?this.q_=this.q_.insert(t,{type:n.type,doc:e.doc}):2===e.type&&2===n.type?this.q_=this.q_.insert(t,{type:2,doc:e.doc}):2===e.type&&0===n.type?this.q_=this.q_.insert(t,{type:0,doc:e.doc}):1===e.type&&0===n.type?this.q_=this.q_.remove(t):1===e.type&&2===n.type?this.q_=this.q_.insert(t,{type:1,doc:n.doc}):0===e.type&&1===n.type?this.q_=this.q_.insert(t,{type:2,doc:e.doc}):v():this.q_=this.q_.insert(t,e)}Q_(){const e=[];return this.q_.inorderTraversal((t,n)=>{e.push(n)}),e}}class Xa{constructor(e,t,n,r,s,i,o,a,u){this.query=e,this.docs=t,this.oldDocs=n,this.docChanges=r,this.mutatedKeys=s,this.fromCache=i,this.syncStateChanged=o,this.excludesMetadataChanges=a,this.hasCachedResults=u}static fromInitialDocuments(e,t,n,r,s){const i=[];return t.forEach(e=>{i.push({type:0,doc:e})}),new Xa(e,t,Ja.emptySet(t),i,n,r,!0,!1,s)}get hasPendingWrites(){return!this.mutatedKeys.isEmpty()}isEqual(e){if(!(this.fromCache===e.fromCache&&this.hasCachedResults===e.hasCachedResults&&this.syncStateChanged===e.syncStateChanged&&this.mutatedKeys.isEqual(e.mutatedKeys)&&Nn(this.query,e.query)&&this.docs.isEqual(e.docs)&&this.oldDocs.isEqual(e.oldDocs)))return!1;const t=this.docChanges,n=e.docChanges;if(t.length!==n.length)return!1;for(let r=0;r<t.length;r++)if(t[r].type!==n[r].type||!t[r].doc.isEqual(n[r].doc))return!1;return!0}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Za{constructor(){this.K_=void 0,this.U_=[]}W_(){return this.U_.some(e=>e.G_())}}class eu{constructor(){this.queries=new Ln(e=>An(e),Nn),this.onlineState="Unknown",this.z_=new Set}}async function tu(e,t){const n=b(e);let r=3;const s=t.query;let i=n.queries.get(s);i?!i.W_()&&t.G_()&&(r=2):(i=new Za,r=t.G_()?0:1);try{switch(r){case 0:i.K_=await n.onListen(s,!0);break;case 1:i.K_=await n.onListen(s,!1);break;case 2:await n.onFirstRemoteStoreListen(s)}}catch(e){const n=Wa(e,`Initialization of query '${Mn(t.query)}' failed`);return void t.onError(n)}n.queries.set(s,i),i.U_.push(t),t.j_(n.onlineState),i.K_&&t.H_(i.K_)&&iu(n)}async function nu(e,t){const n=b(e),r=t.query;let s=3;const i=n.queries.get(r);if(i){const e=i.U_.indexOf(t);e>=0&&(i.U_.splice(e,1),0===i.U_.length?s=t.G_()?0:1:!i.W_()&&t.G_()&&(s=2))}switch(s){case 0:return n.queries.delete(r),n.onUnlisten(r,!0);case 1:return n.queries.delete(r),n.onUnlisten(r,!1);case 2:return n.onLastRemoteStoreUnlisten(r);default:return}}function ru(e,t){const n=b(e);let r=!1;for(const s of t){const e=s.query,t=n.queries.get(e);if(t){for(const e of t.U_)e.H_(s)&&(r=!0);t.K_=s}}r&&iu(n)}function su(e,t,n){const r=b(e),s=r.queries.get(t);if(s)for(const i of s.U_)i.onError(n);r.queries.delete(t)}function iu(e){e.z_.forEach(e=>{e.next()})}var ou,au;(au=ou||(ou={})).J_="default",au.Cache="cache";class uu{constructor(e,t,n){this.query=e,this.Y_=t,this.Z_=!1,this.X_=null,this.onlineState="Unknown",this.options=n||{}}H_(e){if(!this.options.includeMetadataChanges){const t=[];for(const n of e.docChanges)3!==n.type&&t.push(n);e=new Xa(e.query,e.docs,e.oldDocs,t,e.mutatedKeys,e.fromCache,e.syncStateChanged,!0,e.hasCachedResults)}let t=!1;return this.Z_?this.ea(e)&&(this.Y_.next(e),t=!0):this.ta(e,this.onlineState)&&(this.na(e),t=!0),this.X_=e,t}onError(e){this.Y_.error(e)}j_(e){this.onlineState=e;let t=!1;return this.X_&&!this.Z_&&this.ta(this.X_,e)&&(this.na(this.X_),t=!0),t}ta(e,t){if(!e.fromCache)return!0;if(!this.G_())return!0;const n="Offline"!==t;return(!this.options.ra||!n)&&(!e.docs.isEmpty()||e.hasCachedResults||"Offline"===t)}ea(e){if(e.docChanges.length>0)return!0;const t=this.X_&&this.X_.hasPendingWrites!==e.hasPendingWrites;return!(!e.syncStateChanged&&!t)&&!0===this.options.includeMetadataChanges}na(e){e=Xa.fromInitialDocuments(e.query,e.docs,e.mutatedKeys,e.fromCache,e.hasCachedResults),this.Z_=!0,this.Y_.next(e)}G_(){return this.options.source!==ou.Cache}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class cu{constructor(e){this.key=e}}class lu{constructor(e){this.key=e}}class hu{constructor(e,t){this.query=e,this.la=t,this.ha=null,this.hasCachedResults=!1,this.current=!1,this.Pa=Hn(),this.mutatedKeys=Hn(),this.Ia=On(e),this.Ta=new Ja(this.Ia)}get Ea(){return this.la}da(e,t){const n=t?t.Aa:new Ya,r=t?t.Ta:this.Ta;let s=t?t.mutatedKeys:this.mutatedKeys,i=r,o=!1;const a="F"===this.query.limitType&&r.size===this.query.limit?r.last():null,u="L"===this.query.limitType&&r.size===this.query.limit?r.first():null;if(e.inorderTraversal((e,t)=>{const c=r.get(e),l=Rn(this.query,t)?t:null,h=!!c&&this.mutatedKeys.has(c.key),d=!!l&&(l.hasLocalMutations||this.mutatedKeys.has(l.key)&&l.hasCommittedMutations);let f=!1;c&&l?c.data.isEqual(l.data)?h!==d&&(n.track({type:3,doc:l}),f=!0):this.Ra(c,l)||(n.track({type:2,doc:l}),f=!0,(a&&this.Ia(l,a)>0||u&&this.Ia(l,u)<0)&&(o=!0)):!c&&l?(n.track({type:0,doc:l}),f=!0):c&&!l&&(n.track({type:1,doc:c}),f=!0,(a||u)&&(o=!0)),f&&(l?(i=i.add(l),s=d?s.add(e):s.delete(e)):(i=i.delete(e),s=s.delete(e)))}),null!==this.query.limit)for(;i.size>this.query.limit;){const e="F"===this.query.limitType?i.last():i.first();i=i.delete(e.key),s=s.delete(e.key),n.track({type:1,doc:e})}return{Ta:i,Aa:n,Xi:o,mutatedKeys:s}}Ra(e,t){return e.hasLocalMutations&&t.hasCommittedMutations&&!t.hasLocalMutations}applyChanges(e,t,n,r){const s=this.Ta;this.Ta=e.Ta,this.mutatedKeys=e.mutatedKeys;const i=e.Aa.Q_();i.sort((e,t)=>function(e,t){const n=e=>{switch(e){case 0:return 1;case 2:case 3:return 2;case 1:return 0;default:return v()}};return n(e)-n(t)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e.type,t.type)||this.Ia(e.doc,t.doc)),this.Va(n),r=null!=r&&r;const o=t&&!r?this.ma():[],a=0===this.Pa.size&&this.current&&!r?1:0,u=a!==this.ha;return this.ha=a,0!==i.length||u?{snapshot:new Xa(this.query,e.Ta,s,i,e.mutatedKeys,0===a,u,!1,!!n&&n.resumeToken.approximateByteSize()>0),fa:o}:{fa:o}}j_(e){return this.current&&"Offline"===e?(this.current=!1,this.applyChanges({Ta:this.Ta,Aa:new Ya,mutatedKeys:this.mutatedKeys,Xi:!1},!1)):{fa:[]}}ga(e){return!this.la.has(e)&&!!this.Ta.has(e)&&!this.Ta.get(e).hasLocalMutations}Va(e){e&&(e.addedDocuments.forEach(e=>this.la=this.la.add(e)),e.modifiedDocuments.forEach(e=>{}),e.removedDocuments.forEach(e=>this.la=this.la.delete(e)),this.current=e.current)}ma(){if(!this.current)return[];const e=this.Pa;this.Pa=Hn(),this.Ta.forEach(e=>{this.ga(e.key)&&(this.Pa=this.Pa.add(e.key))});const t=[];return e.forEach(e=>{this.Pa.has(e)||t.push(new lu(e))}),this.Pa.forEach(n=>{e.has(n)||t.push(new cu(n))}),t}pa(e){this.la=e.hs,this.Pa=Hn();const t=this.da(e.documents);return this.applyChanges(t,!0)}ya(){return Xa.fromInitialDocuments(this.query,this.Ta,this.mutatedKeys,0===this.ha,this.hasCachedResults)}}class du{constructor(e,t,n){this.query=e,this.targetId=t,this.view=n}}class fu{constructor(e){this.key=e,this.wa=!1}}class mu{constructor(e,t,n,r,s,i){this.localStore=e,this.remoteStore=t,this.eventManager=n,this.sharedClientState=r,this.currentUser=s,this.maxConcurrentLimboResolutions=i,this.Sa={},this.ba=new Ln(e=>An(e),Nn),this.Da=new Map,this.Ca=new Set,this.va=new Ze(K.comparator),this.Fa=new Map,this.Ma=new ho,this.xa={},this.Oa=new Map,this.Na=qi.Ln(),this.onlineState="Unknown",this.La=void 0}get isPrimaryClient(){return!0===this.La}}async function gu(e,t,n=!0){const r=$u(e);let s;const i=r.ba.get(t);return i?(r.sharedClientState.addLocalQueryTarget(i.targetId),s=i.view.ya()):s=await yu(r,t,n,!0),s}async function pu(e,t){const n=$u(e);await yu(n,t,!0,!1)}async function yu(e,t,n,r){const s=await Uo(e.localStore,xn(t)),i=s.targetId,o=n?e.sharedClientState.addLocalQueryTarget(i):"not-current";let a;return r&&(a=await wu(e,t,i,"current"===o,s.resumeToken)),e.isPrimaryClient&&n&&ba(e.remoteStore,s),a}async function wu(e,t,n,r,s){e.Ba=(t,n,r)=>async function(e,t,n,r){let s=t.view.da(n);s.Xi&&(s=await Bo(e.localStore,t.query,!1).then(({documents:e})=>t.view.da(e,s)));const i=r&&r.targetChanges.get(t.targetId),o=r&&null!=r.targetMismatches.get(t.targetId),a=t.view.applyChanges(s,e.isPrimaryClient,i,o);return Au(e,t.targetId,a.fa),a.snapshot}(e,t,n,r);const i=await Bo(e.localStore,t,!0),o=new hu(t,i.hs),a=o.da(i.documents),u=$r.createSynthesizedTargetChangeForCurrentChange(n,r&&"Offline"!==e.onlineState,s),c=o.applyChanges(a,e.isPrimaryClient,u);Au(e,n,c.fa);const l=new du(t,n,o);return e.ba.set(t,l),e.Da.has(n)?e.Da.get(n).push(t):e.Da.set(n,[t]),c.snapshot}async function vu(e,t,n){const r=b(e),s=r.ba.get(t),i=r.Da.get(s.targetId);if(i.length>1)return r.Da.set(s.targetId,i.filter(e=>!Nn(e,t))),void r.ba.delete(t);r.isPrimaryClient?(r.sharedClientState.removeLocalQueryTarget(s.targetId),r.sharedClientState.isActiveQueryTarget(s.targetId)||await qo(r.localStore,s.targetId,!1).then(()=>{r.sharedClientState.clearQueryState(s.targetId),n&&Ea(r.remoteStore,s.targetId),ku(r,s.targetId)}).catch(ne)):(ku(r,s.targetId),await qo(r.localStore,s.targetId,!0))}async function Iu(e,t){const n=b(e),r=n.ba.get(t),s=n.Da.get(r.targetId);n.isPrimaryClient&&1===s.length&&(n.sharedClientState.removeLocalQueryTarget(r.targetId),Ea(n.remoteStore,r.targetId))}async function bu(e,t,n){const r=Qu(e);try{const e=await function(e,t){const n=b(e),r=P.now(),s=t.reduce((e,t)=>e.add(t.key),Hn());let i,o;return n.persistence.runTransaction("Locally write mutations","readwrite",e=>{let a=Un(),u=Hn();return n.os.getEntries(e,s).next(e=>{a=e,a.forEach((e,t)=>{t.isValidDocument()||(u=u.add(e))})}).next(()=>n.localDocuments.getOverlayedDocuments(e,a)).next(s=>{i=s;const o=[];for(const e of t){const t=br(e,i.get(e.key).overlayedDocument);null!=t&&o.push(new _r(e.key,t,Ut(t.value.mapValue),gr.exists(!0)))}return n.mutationQueue.addMutationBatch(e,r,o,t)}).next(t=>{o=t;const r=t.applyToLocalDocumentSet(i,u);return n.documentOverlayCache.saveOverlays(e,t.batchId,r)})}).then(()=>({batchId:o.batchId,changes:zn(i)}))}(r.localStore,t);r.sharedClientState.addPendingMutation(e.batchId),function(e,t,n){let r=e.xa[e.currentUser.toKey()];r||(r=new Ze(O)),r=r.insert(t,n),e.xa[e.currentUser.toKey()]=r}(r,e.batchId,n),await Vu(r,e.changes),await Oa(r.remoteStore)}catch(e){const t=Wa(e,"Failed to persist write");n.reject(t)}}async function Eu(e,t){const n=b(e);try{const e=await Fo(n.localStore,t);t.targetChanges.forEach((e,t)=>{const r=n.Fa.get(t);r&&(I(e.addedDocuments.size+e.modifiedDocuments.size+e.removedDocuments.size<=1),e.addedDocuments.size>0?r.wa=!0:e.modifiedDocuments.size>0?I(r.wa):e.removedDocuments.size>0&&(I(r.wa),r.wa=!1))}),await Vu(n,e,t)}catch(e){await ne(e)}}function Tu(e,t,n){const r=b(e);if(r.isPrimaryClient&&0===n||!r.isPrimaryClient&&1===n){const e=[];r.ba.forEach((n,r)=>{const s=r.view.j_(t);s.snapshot&&e.push(s.snapshot)}),function(e,t){const n=b(e);n.onlineState=t;let r=!1;n.queries.forEach((e,n)=>{for(const s of n.U_)s.j_(t)&&(r=!0)}),r&&iu(n)}(r.eventManager,t),e.length&&r.Sa.h_(e),r.onlineState=t,r.isPrimaryClient&&r.sharedClientState.setOnlineState(t)}}async function _u(e,t,n){const r=b(e);r.sharedClientState.updateQueryState(t,"rejected",n);const s=r.Fa.get(t),i=s&&s.key;if(i){let e=new Ze(K.comparator);e=e.insert(i,qt.newNoDocument(i,U.min()));const n=Hn().add(i),s=new jr(U.min(),new Map,new Ze(O),e,n);await Eu(r,s),r.va=r.va.remove(i),r.Fa.delete(t),Ru(r)}else await qo(r.localStore,t,!1).then(()=>ku(r,t,n)).catch(ne)}async function Su(e,t){const n=b(e),r=t.batch.batchId;try{const e=await Vo(n.localStore,t);Du(n,r,null),Cu(n,r),n.sharedClientState.updateMutationState(r,"acknowledged"),await Vu(n,e)}catch(e){await ne(e)}}async function xu(e,t,n){const r=b(e);try{const e=await function(e,t){const n=b(e);return n.persistence.runTransaction("Reject batch","readwrite-primary",e=>{let r;return n.mutationQueue.lookupMutationBatch(e,t).next(t=>(I(null!==t),r=t.keys(),n.mutationQueue.removeMutationBatch(e,t))).next(()=>n.mutationQueue.performConsistencyCheck(e)).next(()=>n.documentOverlayCache.removeOverlaysForBatchId(e,r,t)).next(()=>n.localDocuments.recalculateAndSaveOverlaysForDocumentKeys(e,r)).next(()=>n.localDocuments.getDocuments(e,r))})}(r.localStore,t);Du(r,t,n),Cu(r,t),r.sharedClientState.updateMutationState(t,"rejected",n),await Vu(r,e)}catch(n){await ne(n)}}function Cu(e,t){(e.Oa.get(t)||[]).forEach(e=>{e.resolve()}),e.Oa.delete(t)}function Du(e,t,n){const r=b(e);let s=r.xa[r.currentUser.toKey()];if(s){const e=s.get(t);e&&(n?e.reject(n):e.resolve(),s=s.remove(t)),r.xa[r.currentUser.toKey()]=s}}function ku(e,t,n=null){e.sharedClientState.removeLocalQueryTarget(t);for(const r of e.Da.get(t))e.ba.delete(r),n&&e.Sa.ka(r,n);e.Da.delete(t),e.isPrimaryClient&&e.Ma.Vr(t).forEach(t=>{e.Ma.containsKey(t)||Nu(e,t)})}function Nu(e,t){e.Ca.delete(t.path.canonicalString());const n=e.va.get(t);null!==n&&(Ea(e.remoteStore,n),e.va=e.va.remove(t),e.Fa.delete(n),Ru(e))}function Au(e,t,n){for(const r of n)r instanceof cu?(e.Ma.addReference(r.key,t),Mu(e,r)):r instanceof lu?(g("SyncEngine","Document no longer in limbo: "+r.key),e.Ma.removeReference(r.key,t),e.Ma.containsKey(r.key)||Nu(e,r.key)):v()}function Mu(e,t){const n=t.key,r=n.path.canonicalString();e.va.get(n)||e.Ca.has(r)||(g("SyncEngine","New document in limbo: "+n),e.Ca.add(r),Ru(e))}function Ru(e){for(;e.Ca.size>0&&e.va.size<e.maxConcurrentLimboResolutions;){const t=e.Ca.values().next().value;e.Ca.delete(t);const n=new K(B.fromString(t)),r=e.Na.next();e.Fa.set(r,new fu(n)),e.va=e.va.insert(n,r),ba(e.remoteStore,new Ls(xn(En(n.path)),r,"TargetPurposeLimboResolution",pe.oe))}}async function Vu(e,t,n){const r=b(e),s=[],i=[],o=[];r.ba.isEmpty()||(r.ba.forEach((e,a)=>{o.push(r.Ba(a,t,n).then(e=>{var t;if((e||n)&&r.isPrimaryClient){const s=e?!e.fromCache:null===(t=null==n?void 0:n.targetChanges.get(a.targetId))||void 0===t?void 0:t.current;r.sharedClientState.updateQueryState(a.targetId,s?"current":"not-current")}if(e){s.push(e);const t=Do.Ki(a.targetId,e);i.push(t)}}))}),await Promise.all(o),r.Sa.h_(s),await async function(e,t){const n=b(e);try{await n.persistence.runTransaction("notifyLocalViewChanges","readwrite",e=>re.forEach(t,t=>re.forEach(t.qi,r=>n.persistence.referenceDelegate.addReference(e,t.targetId,r)).next(()=>re.forEach(t.Qi,r=>n.persistence.referenceDelegate.removeReference(e,t.targetId,r)))))}catch(e){if(!ce(e))throw e;g("LocalStore","Failed to update sequence numbers: "+e)}for(const r of t){const e=r.targetId;if(!r.fromCache){const t=n.ns.get(e),r=t.snapshotVersion,s=t.withLastLimboFreeSnapshotVersion(r);n.ns=n.ns.insert(e,s)}}}(r.localStore,i))}async function Ou(e,t){const n=b(e);if(!n.currentUser.isEqual(t)){g("SyncEngine","User change. New user:",t.toKey());const e=await Ro(n.localStore,t);n.currentUser=t,function(e,t){e.Oa.forEach(e=>{e.forEach(e=>{e.reject(new T(E.CANCELLED,t))})}),e.Oa.clear()}(n,"'waitForPendingWrites' promise is rejected due to a user change."),n.sharedClientState.handleUserChange(t,e.removedBatchIds,e.addedBatchIds),await Vu(n,e.us)}}function Fu(e,t){const n=b(e),r=n.Fa.get(t);if(r&&r.wa)return Hn().add(r.key);{let e=Hn();const r=n.Da.get(t);if(!r)return e;for(const t of r){const r=n.ba.get(t);e=e.unionWith(r.view.Ea)}return e}}async function Lu(e,t){const n=b(e),r=await Bo(n.localStore,t.query,!0),s=t.view.pa(r);return n.isPrimaryClient&&Au(n,t.targetId,s.fa),s}async function Pu(e,t){const n=b(e);return Go(n.localStore,t).then(e=>Vu(n,e))}async function Uu(e,t,n,r){const s=b(e),i=await function(e,t){const n=b(e),r=b(n.mutationQueue);return n.persistence.runTransaction("Lookup mutation documents","readonly",e=>r.vn(e,t).next(t=>t?n.localDocuments.getDocuments(e,t):re.resolve(null)))}(s.localStore,t);null!==i?("pending"===n?await Oa(s.remoteStore):"acknowledged"===n||"rejected"===n?(Du(s,t,r||null),Cu(s,t),function(e,t){b(b(e).mutationQueue).Mn(t)}(s.localStore,t)):v(),await Vu(s,i)):g("SyncEngine","Cannot apply mutation batch with id: "+t)}async function qu(e,t){const n=b(e);if($u(n),Qu(n),!0===t&&!0!==n.La){const e=n.sharedClientState.getAllActiveQueryTargets(),t=await Bu(n,e.toArray());n.La=!0,await ja(n.remoteStore,!0);for(const r of t)ba(n.remoteStore,r)}else if(!1===t&&!1!==n.La){const e=[];let t=Promise.resolve();n.Da.forEach((r,s)=>{n.sharedClientState.isLocalQueryTarget(s)?e.push(s):t=t.then(()=>(ku(n,s),qo(n.localStore,s,!0))),Ea(n.remoteStore,s)}),await t,await Bu(n,e),function(e){const t=b(e);t.Fa.forEach((e,n)=>{Ea(t.remoteStore,n)}),t.Ma.mr(),t.Fa=new Map,t.va=new Ze(K.comparator)}(n),n.La=!1,await ja(n.remoteStore,!1)}}async function Bu(e,t,n){const r=b(e),s=[],i=[];for(const o of t){let e;const t=r.Da.get(o);if(t&&0!==t.length){e=await Uo(r.localStore,xn(t[0]));for(const e of t){const t=r.ba.get(e),n=await Lu(r,t);n.snapshot&&i.push(n.snapshot)}}else{const t=await zo(r.localStore,o);e=await Uo(r.localStore,t),await wu(r,zu(t),o,!1,e.resumeToken)}s.push(e)}return r.Sa.h_(i),s}function zu(e){return bn(e.path,e.collectionGroup,e.orderBy,e.filters,e.limit,"F",e.startAt,e.endAt)}function Gu(e){return function(e){return b(b(e).persistence).Bi()}(b(e).localStore)}async function Ku(e,t,n,r){const s=b(e);if(s.La)return void g("SyncEngine","Ignoring unexpected query state notification.");const i=s.Da.get(t);if(i&&i.length>0)switch(n){case"current":case"not-current":{const e=await Go(s.localStore,Vn(i[0])),r=jr.createSynthesizedRemoteEventForCurrentChange(t,"current"===n,at.EMPTY_BYTE_STRING);await Vu(s,e,r);break}case"rejected":await qo(s.localStore,t,!0),ku(s,t,r);break;default:v()}}async function ju(e,t,n){const r=$u(e);if(r.La){for(const e of t){if(r.Da.has(e)&&r.sharedClientState.isActiveQueryTarget(e)){g("SyncEngine","Adding an already active target "+e);continue}const t=await zo(r.localStore,e),n=await Uo(r.localStore,t);await wu(r,zu(t),n.targetId,!1,n.resumeToken),ba(r.remoteStore,n)}for(const e of n)r.Da.has(e)&&await qo(r.localStore,e,!1).then(()=>{Ea(r.remoteStore,e),ku(r,e)}).catch(ne)}}function $u(e){const t=b(e);return t.remoteStore.remoteSyncer.applyRemoteEvent=Eu.bind(null,t),t.remoteStore.remoteSyncer.getRemoteKeysForTarget=Fu.bind(null,t),t.remoteStore.remoteSyncer.rejectListen=_u.bind(null,t),t.Sa.h_=ru.bind(null,t.eventManager),t.Sa.ka=su.bind(null,t.eventManager),t}function Qu(e){const t=b(e);return t.remoteStore.remoteSyncer.applySuccessfulWrite=Su.bind(null,t),t.remoteStore.remoteSyncer.rejectFailedWrite=xu.bind(null,t),t}class Hu{constructor(){this.synchronizeTabs=!1}async initialize(e){this.serializer=ha(e.databaseInfo.databaseId),this.sharedClientState=this.createSharedClientState(e),this.persistence=this.createPersistence(e),await this.persistence.start(),this.localStore=this.createLocalStore(e),this.gcScheduler=this.createGarbageCollectionScheduler(e,this.localStore),this.indexBackfillerScheduler=this.createIndexBackfillerScheduler(e,this.localStore)}createGarbageCollectionScheduler(e,t){return null}createIndexBackfillerScheduler(e,t){return null}createLocalStore(e){return Mo(this.persistence,new No,e.initialUser,this.serializer)}createPersistence(e){return new wo(Io.Hr,this.serializer)}createSharedClientState(e){return new ea}async terminate(){var e,t;null===(e=this.gcScheduler)||void 0===e||e.stop(),null===(t=this.indexBackfillerScheduler)||void 0===t||t.stop(),this.sharedClientState.shutdown(),await this.persistence.shutdown()}}class Wu extends Hu{constructor(e,t,n){super(),this.Qa=e,this.cacheSizeBytes=t,this.forceOwnership=n,this.synchronizeTabs=!1}async initialize(e){await super.initialize(e),await this.Qa.initialize(this,e),await Qu(this.Qa.syncEngine),await Oa(this.Qa.remoteStore),await this.persistence.fi(()=>(this.gcScheduler&&!this.gcScheduler.started&&this.gcScheduler.start(),this.indexBackfillerScheduler&&!this.indexBackfillerScheduler.started&&this.indexBackfillerScheduler.start(),Promise.resolve()))}createLocalStore(e){return Mo(this.persistence,new No,e.initialUser,this.serializer)}createGarbageCollectionScheduler(e,t){const n=this.persistence.referenceDelegate.garbageCollector;return new Qi(n,e.asyncQueue,t)}createIndexBackfillerScheduler(e,t){const n=new ge(t,this.persistence);return new me(e.asyncQueue,n)}createPersistence(e){const t=Co(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey),n=void 0!==this.cacheSizeBytes?Mi.withCacheSize(this.cacheSizeBytes):Mi.DEFAULT;return new _o(this.synchronizeTabs,t,e.clientId,n,e.asyncQueue,ca(),la(),this.serializer,this.sharedClientState,!!this.forceOwnership)}createSharedClientState(e){return new ea}}class Ju extends Wu{constructor(e,t){super(e,t,!1),this.Qa=e,this.cacheSizeBytes=t,this.synchronizeTabs=!0}async initialize(e){await super.initialize(e);const t=this.Qa.syncEngine;this.sharedClientState instanceof Zo&&(this.sharedClientState.syncEngine={Zs:Uu.bind(null,t),Xs:Ku.bind(null,t),eo:ju.bind(null,t),Bi:Gu.bind(null,t),Ys:Pu.bind(null,t)},await this.sharedClientState.start()),await this.persistence.fi(async e=>{await qu(this.Qa.syncEngine,e),this.gcScheduler&&(e&&!this.gcScheduler.started?this.gcScheduler.start():e||this.gcScheduler.stop()),this.indexBackfillerScheduler&&(e&&!this.indexBackfillerScheduler.started?this.indexBackfillerScheduler.start():e||this.indexBackfillerScheduler.stop())})}createSharedClientState(e){const t=ca();if(!Zo.D(t))throw new T(E.UNIMPLEMENTED,"IndexedDB persistence is only available on platforms that support LocalStorage.");const n=Co(e.databaseInfo.databaseId,e.databaseInfo.persistenceKey);return new Zo(t,e.asyncQueue,n,e.clientId,e.initialUser)}}class Yu{async initialize(e,t){this.localStore||(this.localStore=e.localStore,this.sharedClientState=e.sharedClientState,this.datastore=this.createDatastore(t),this.remoteStore=this.createRemoteStore(t),this.eventManager=this.createEventManager(t),this.syncEngine=this.createSyncEngine(t,!e.synchronizeTabs),this.sharedClientState.onlineStateHandler=e=>Tu(this.syncEngine,e,1),this.remoteStore.remoteSyncer.handleCredentialChange=Ou.bind(null,this.syncEngine),await ja(this.remoteStore,this.syncEngine.isPrimaryClient))}createEventManager(e){return function(){return new eu}()}createDatastore(e){const t=ha(e.databaseInfo.databaseId),n=function(e){return new ua(e)}(e.databaseInfo);return function(e,t,n,r){return new pa(e,t,n,r)}(e.authCredentials,e.appCheckCredentials,n,t)}createRemoteStore(e){return function(e,t,n,r,s){return new wa(e,t,n,r,s)}(this.localStore,this.datastore,e.asyncQueue,e=>Tu(this.syncEngine,e,0),function(){return na.D()?new na:new ta}())}createSyncEngine(e,t){return function(e,t,n,r,s,i,o){const a=new mu(e,t,n,r,s,i);return o&&(a.La=!0),a}(this.localStore,this.remoteStore,this.eventManager,this.sharedClientState,e.initialUser,e.maxConcurrentLimboResolutions,t)}async terminate(){var e;await async function(e){const t=b(e);g("RemoteStore","RemoteStore shutting down."),t.M_.add(5),await Ia(t),t.O_.shutdown(),t.N_.set("Unknown")}(this.remoteStore),null===(e=this.datastore)||void 0===e||e.terminate()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Xu{constructor(e){this.observer=e,this.muted=!1}next(e){this.observer.next&&this.Ka(this.observer.next,e)}error(e){this.observer.error?this.Ka(this.observer.error,e):p("Uncaught Error in snapshot listener:",e.toString())}$a(){this.muted=!0}Ka(e,t){this.muted||setTimeout(()=>{this.muted||e(t)},0)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Zu{constructor(e,t,n,r){this.authCredentials=e,this.appCheckCredentials=t,this.asyncQueue=n,this.databaseInfo=r,this.user=h.UNAUTHENTICATED,this.clientId=V.newId(),this.authCredentialListener=()=>Promise.resolve(),this.appCheckCredentialListener=()=>Promise.resolve(),this.authCredentials.start(n,async e=>{g("FirestoreClient","Received user=",e.uid),await this.authCredentialListener(e),this.user=e}),this.appCheckCredentials.start(n,e=>(g("FirestoreClient","Received new app check token=",e),this.appCheckCredentialListener(e,this.user)))}get configuration(){return{asyncQueue:this.asyncQueue,databaseInfo:this.databaseInfo,clientId:this.clientId,authCredentials:this.authCredentials,appCheckCredentials:this.appCheckCredentials,initialUser:this.user,maxConcurrentLimboResolutions:100}}setCredentialChangeListener(e){this.authCredentialListener=e}setAppCheckTokenChangeListener(e){this.appCheckCredentialListener=e}verifyNotTerminated(){if(this.asyncQueue.isShuttingDown)throw new T(E.FAILED_PRECONDITION,"The client has already been terminated.")}terminate(){this.asyncQueue.enterRestrictedMode();const e=new _;return this.asyncQueue.enqueueAndForgetEvenWhileRestricted(async()=>{try{this._onlineComponents&&await this._onlineComponents.terminate(),this._offlineComponents&&await this._offlineComponents.terminate(),this.authCredentials.shutdown(),this.appCheckCredentials.shutdown(),e.resolve()}catch(t){const n=Wa(t,"Failed to shutdown persistence");e.reject(n)}}),e.promise}}async function ec(e,t){e.asyncQueue.verifyOperationInProgress(),g("FirestoreClient","Initializing OfflineComponentProvider");const n=e.configuration;await t.initialize(n);let r=n.initialUser;e.setCredentialChangeListener(async e=>{r.isEqual(e)||(await Ro(t.localStore,e),r=e)}),t.persistence.setDatabaseDeletedListener(()=>e.terminate()),e._offlineComponents=t}async function tc(e,t){e.asyncQueue.verifyOperationInProgress();const n=await rc(e);g("FirestoreClient","Initializing OnlineComponentProvider"),await t.initialize(n,e.configuration),e.setCredentialChangeListener(e=>Ka(t.remoteStore,e)),e.setAppCheckTokenChangeListener((e,n)=>Ka(t.remoteStore,n)),e._onlineComponents=t}function nc(e){return"FirebaseError"===e.name?e.code===E.FAILED_PRECONDITION||e.code===E.UNIMPLEMENTED:!("undefined"!=typeof DOMException&&e instanceof DOMException)||22===e.code||20===e.code||11===e.code}async function rc(e){if(!e._offlineComponents)if(e._uninitializedComponentsProvider){g("FirestoreClient","Using user provided OfflineComponentProvider");try{await ec(e,e._uninitializedComponentsProvider._offline)}catch(t){const n=t;if(!nc(n))throw n;y("Error using user provided cache. Falling back to memory cache: "+n),await ec(e,new Hu)}}else g("FirestoreClient","Using default OfflineComponentProvider"),await ec(e,new Hu);return e._offlineComponents}async function sc(e){return e._onlineComponents||(e._uninitializedComponentsProvider?(g("FirestoreClient","Using user provided OnlineComponentProvider"),await tc(e,e._uninitializedComponentsProvider._online)):(g("FirestoreClient","Using default OnlineComponentProvider"),await tc(e,new Yu))),e._onlineComponents}function ic(e){return sc(e).then(e=>e.syncEngine)}async function oc(e){const t=await sc(e),n=t.eventManager;return n.onListen=gu.bind(null,t.syncEngine),n.onUnlisten=vu.bind(null,t.syncEngine),n.onFirstRemoteStoreListen=pu.bind(null,t.syncEngine),n.onLastRemoteStoreUnlisten=Iu.bind(null,t.syncEngine),n}function ac(e,t,n={}){const r=new _;return e.asyncQueue.enqueueAndForget(async()=>function(e,t,n,r,s){const i=new Xu({next:i=>{t.enqueueAndForget(()=>nu(e,o));const a=i.docs.has(n);!a&&i.fromCache?s.reject(new T(E.UNAVAILABLE,"Failed to get document because the client is offline.")):a&&i.fromCache&&r&&"server"===r.source?s.reject(new T(E.UNAVAILABLE,'Failed to get document from server. (However, this document does exist in the local cache. Run again without setting source to "server" to retrieve the cached document.)')):s.resolve(i)},error:e=>s.reject(e)}),o=new uu(En(n.path),i,{includeMetadataChanges:!0,ra:!0});return tu(e,o)}(await oc(e),e.asyncQueue,t,n,r)),r.promise}function uc(e,t,n={}){const r=new _;return e.asyncQueue.enqueueAndForget(async()=>function(e,t,n,r,s){const i=new Xu({next:n=>{t.enqueueAndForget(()=>nu(e,o)),n.fromCache&&"server"===r.source?s.reject(new T(E.UNAVAILABLE,'Failed to get documents from server. (However, these documents may exist in the local cache. Run again without setting source to "server" to retrieve the cached documents.)')):s.resolve(n)},error:e=>s.reject(e)}),o=new uu(n,i,{includeMetadataChanges:!0,ra:!0});return tu(e,o)}(await oc(e),e.asyncQueue,t,n,r)),r.promise}
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function cc(e){const t={};return void 0!==e.timeoutSeconds&&(t.timeoutSeconds=e.timeoutSeconds),t
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}const lc=new Map;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function hc(e,t,n){if(!n)throw new T(E.INVALID_ARGUMENT,`Function ${e}() cannot be called with an empty ${t}.`)}function dc(e,t,n,r){if(!0===t&&!0===r)throw new T(E.INVALID_ARGUMENT,`${e} and ${n} cannot be used together.`)}function fc(e){if(!K.isDocumentKey(e))throw new T(E.INVALID_ARGUMENT,`Invalid document reference. Document references must have an even number of segments, but ${e} has ${e.length}.`)}function mc(e){if(K.isDocumentKey(e))throw new T(E.INVALID_ARGUMENT,`Invalid collection reference. Collection references must have an odd number of segments, but ${e} has ${e.length}.`)}function gc(e){if(void 0===e)return"undefined";if(null===e)return"null";if("string"==typeof e)return e.length>20&&(e=e.substring(0,20)+"..."),JSON.stringify(e);if("number"==typeof e||"boolean"==typeof e)return""+e;if("object"==typeof e){if(e instanceof Array)return"an array";{const t=function(e){return e.constructor?e.constructor.name:null}(e);return t?`a custom ${t} object`:"an object"}}return"function"==typeof e?"a function":v()}function pc(e,t){if("_delegate"in e&&(e=e._delegate),!(e instanceof t)){if(t.name===e.constructor.name)throw new T(E.INVALID_ARGUMENT,"Type does not match the expected instance. Did you pass a reference from a different Firestore SDK?");{const n=gc(e);throw new T(E.INVALID_ARGUMENT,`Expected type '${t.name}', but it was: ${n}`)}}return e}function yc(e,t){if(t<=0)throw new T(E.INVALID_ARGUMENT,`Function ${e}() requires a positive number, but it was: ${t}.`)}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class wc{constructor(e){var t,n;if(void 0===e.host){if(void 0!==e.ssl)throw new T(E.INVALID_ARGUMENT,"Can't provide ssl option if host option is not set");this.host="firestore.googleapis.com",this.ssl=!0}else this.host=e.host,this.ssl=null===(t=e.ssl)||void 0===t||t;if(this.credentials=e.credentials,this.ignoreUndefinedProperties=!!e.ignoreUndefinedProperties,this.localCache=e.localCache,void 0===e.cacheSizeBytes)this.cacheSizeBytes=41943040;else{if(-1!==e.cacheSizeBytes&&e.cacheSizeBytes<1048576)throw new T(E.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");this.cacheSizeBytes=e.cacheSizeBytes}dc("experimentalForceLongPolling",e.experimentalForceLongPolling,"experimentalAutoDetectLongPolling",e.experimentalAutoDetectLongPolling),this.experimentalForceLongPolling=!!e.experimentalForceLongPolling,this.experimentalForceLongPolling?this.experimentalAutoDetectLongPolling=!1:void 0===e.experimentalAutoDetectLongPolling?this.experimentalAutoDetectLongPolling=!0:this.experimentalAutoDetectLongPolling=!!e.experimentalAutoDetectLongPolling,this.experimentalLongPollingOptions=cc(null!==(n=e.experimentalLongPollingOptions)&&void 0!==n?n:{}),function(e){if(void 0!==e.timeoutSeconds){if(isNaN(e.timeoutSeconds))throw new T(E.INVALID_ARGUMENT,`invalid long polling timeout: ${e.timeoutSeconds} (must not be NaN)`);if(e.timeoutSeconds<5)throw new T(E.INVALID_ARGUMENT,`invalid long polling timeout: ${e.timeoutSeconds} (minimum allowed value is 5)`);if(e.timeoutSeconds>30)throw new T(E.INVALID_ARGUMENT,`invalid long polling timeout: ${e.timeoutSeconds} (maximum allowed value is 30)`)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(this.experimentalLongPollingOptions),this.useFetchStreams=!!e.useFetchStreams}isEqual(e){return this.host===e.host&&this.ssl===e.ssl&&this.credentials===e.credentials&&this.cacheSizeBytes===e.cacheSizeBytes&&this.experimentalForceLongPolling===e.experimentalForceLongPolling&&this.experimentalAutoDetectLongPolling===e.experimentalAutoDetectLongPolling&&function(e,t){return e.timeoutSeconds===t.timeoutSeconds}(this.experimentalLongPollingOptions,e.experimentalLongPollingOptions)&&this.ignoreUndefinedProperties===e.ignoreUndefinedProperties&&this.useFetchStreams===e.useFetchStreams}}class vc{constructor(e,t,n,r){this._authCredentials=e,this._appCheckCredentials=t,this._databaseId=n,this._app=r,this.type="firestore-lite",this._persistenceKey="(lite)",this._settings=new wc({}),this._settingsFrozen=!1}get app(){if(!this._app)throw new T(E.FAILED_PRECONDITION,"Firestore was not initialized using the Firebase SDK. 'app' is not available");return this._app}get _initialized(){return this._settingsFrozen}get _terminated(){return void 0!==this._terminateTask}_setSettings(e){if(this._settingsFrozen)throw new T(E.FAILED_PRECONDITION,"Firestore has already been started and its settings can no longer be changed. You can only modify settings before calling any other methods on a Firestore object.");this._settings=new wc(e),void 0!==e.credentials&&(this._authCredentials=function(e){if(!e)return new x;switch(e.type){case"firstParty":return new N(e.sessionIndex||"0",e.iamToken||null,e.authTokenFactory||null);case"provider":return e.client;default:throw new T(E.INVALID_ARGUMENT,"makeAuthCredentialsProvider failed due to invalid credential type")}}(e.credentials))}_getSettings(){return this._settings}_freezeSettings(){return this._settingsFrozen=!0,this._settings}_delete(){return this._terminateTask||(this._terminateTask=this._terminate()),this._terminateTask}toJSON(){return{app:this._app,databaseId:this._databaseId,settings:this._settings}}_terminate(){return function(e){const t=lc.get(e);t&&(g("ComponentProvider","Removing Datastore"),lc.delete(e),t.terminate())}(this),Promise.resolve()}}function Ic(e,t,n,r={}){var s;const i=(e=pc(e,vc))._getSettings(),o=`${t}:${n}`;if("firestore.googleapis.com"!==i.host&&i.host!==o&&y("Host has been set in both settings() and connectFirestoreEmulator(), emulator host will be used."),e._setSettings(Object.assign(Object.assign({},i),{host:o,ssl:!1})),r.mockUserToken){let t,n;if("string"==typeof r.mockUserToken)t=r.mockUserToken,n=h.MOCK_USER;else{t=Object(a["k"])(r.mockUserToken,null===(s=e._app)||void 0===s?void 0:s.options.projectId);const i=r.mockUserToken.sub||r.mockUserToken.user_id;if(!i)throw new T(E.INVALID_ARGUMENT,"mockUserToken must contain 'sub' or 'user_id' field!");n=new h(i)}e._authCredentials=new C(new S(t,n))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class bc{constructor(e,t,n){this.converter=t,this._query=n,this.type="query",this.firestore=e}withConverter(e){return new bc(this.firestore,e,this._query)}}class Ec{constructor(e,t,n){this.converter=t,this._key=n,this.type="document",this.firestore=e}get _path(){return this._key.path}get id(){return this._key.path.lastSegment()}get path(){return this._key.path.canonicalString()}get parent(){return new Tc(this.firestore,this.converter,this._key.path.popLast())}withConverter(e){return new Ec(this.firestore,e,this._key)}}class Tc extends bc{constructor(e,t,n){super(e,t,En(n)),this._path=n,this.type="collection"}get id(){return this._query.path.lastSegment()}get path(){return this._query.path.canonicalString()}get parent(){const e=this._path.popLast();return e.isEmpty()?null:new Ec(this.firestore,null,new K(e))}withConverter(e){return new Tc(this.firestore,e,this._path)}}function _c(e,t,...n){if(e=Object(a["q"])(e),hc("collection","path",t),e instanceof vc){const r=B.fromString(t,...n);return mc(r),new Tc(e,null,r)}{if(!(e instanceof Ec||e instanceof Tc))throw new T(E.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=e._path.child(B.fromString(t,...n));return mc(r),new Tc(e.firestore,null,r)}}function Sc(e,t,...n){if(e=Object(a["q"])(e),1===arguments.length&&(t=V.newId()),hc("doc","path",t),e instanceof vc){const r=B.fromString(t,...n);return fc(r),new Ec(e,null,new K(r))}{if(!(e instanceof Ec||e instanceof Tc))throw new T(E.INVALID_ARGUMENT,"Expected first argument to collection() to be a CollectionReference, a DocumentReference or FirebaseFirestore");const r=e._path.child(B.fromString(t,...n));return fc(r),new Ec(e.firestore,e instanceof Tc?e.converter:null,new K(r))}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class xc{constructor(){this.iu=Promise.resolve(),this.su=[],this.ou=!1,this._u=[],this.au=null,this.uu=!1,this.cu=!1,this.lu=[],this.Yo=new da(this,"async_queue_retry"),this.hu=()=>{const e=la();e&&g("AsyncQueue","Visibility state changed to "+e.visibilityState),this.Yo.Wo()};const e=la();e&&"function"==typeof e.addEventListener&&e.addEventListener("visibilitychange",this.hu)}get isShuttingDown(){return this.ou}enqueueAndForget(e){this.enqueue(e)}enqueueAndForgetEvenWhileRestricted(e){this.Pu(),this.Iu(e)}enterRestrictedMode(e){if(!this.ou){this.ou=!0,this.cu=e||!1;const t=la();t&&"function"==typeof t.removeEventListener&&t.removeEventListener("visibilitychange",this.hu)}}enqueue(e){if(this.Pu(),this.ou)return new Promise(()=>{});const t=new _;return this.Iu(()=>this.ou&&this.cu?Promise.resolve():(e().then(t.resolve,t.reject),t.promise)).then(()=>t.promise)}enqueueRetryable(e){this.enqueueAndForget(()=>(this.su.push(e),this.Tu()))}async Tu(){if(0!==this.su.length){try{await this.su[0](),this.su.shift(),this.Yo.reset()}catch(e){if(!ce(e))throw e;g("AsyncQueue","Operation failed with retryable error: "+e)}this.su.length>0&&this.Yo.$o(()=>this.Tu())}}Iu(e){const t=this.iu.then(()=>(this.uu=!0,e().catch(e=>{this.au=e,this.uu=!1;const t=function(e){let t=e.message||"";return e.stack&&(t=e.stack.includes(e.message)?e.stack:e.message+"\n"+e.stack),t}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e);throw p("INTERNAL UNHANDLED ERROR: ",t),e}).then(e=>(this.uu=!1,e))));return this.iu=t,t}enqueueAfterDelay(e,t,n){this.Pu(),this.lu.indexOf(e)>-1&&(t=0);const r=Ha.createAndSchedule(this,e,t,n,e=>this.Eu(e));return this._u.push(r),r}Pu(){this.au&&v()}verifyOperationInProgress(){}async du(){let e;do{e=this.iu,await e}while(e!==this.iu)}Au(e){for(const t of this._u)if(t.timerId===e)return!0;return!1}Ru(e){return this.du().then(()=>{this._u.sort((e,t)=>e.targetTimeMs-t.targetTimeMs);for(const t of this._u)if(t.skipDelay(),"all"!==e&&t.timerId===e)break;return this.du()})}Vu(e){this.lu.push(e)}Eu(e){const t=this._u.indexOf(e);this._u.splice(t,1)}}function Cc(e){return function(e,t){if("object"!=typeof e||null===e)return!1;const n=e;for(const r of t)if(r in n&&"function"==typeof n[r])return!0;return!1}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(e,["next","error","complete"])}class Dc extends vc{constructor(e,t,n,r){super(e,t,n,r),this.type="firestore",this._queue=function(){return new xc}(),this._persistenceKey=(null==r?void 0:r.name)||"[DEFAULT]"}_terminate(){return this._firestoreClient||Mc(this),this._firestoreClient.terminate()}}function kc(e,t,n){n||(n="(default)");const r=Object(s["b"])(e,"firestore");if(r.isInitialized(n)){const e=r.getImmediate({identifier:n}),s=r.getOptions(n);if(Object(a["m"])(s,t))return e;throw new T(E.FAILED_PRECONDITION,"initializeFirestore() has already been called with different options. To avoid this error, call initializeFirestore() with the same options as when it was originally called, or call getFirestore() to return the already initialized instance.")}if(void 0!==t.cacheSizeBytes&&void 0!==t.localCache)throw new T(E.INVALID_ARGUMENT,"cache and cacheSizeBytes cannot be specified at the same time as cacheSizeBytes willbe deprecated. Instead, specify the cache size in the cache object");if(void 0!==t.cacheSizeBytes&&-1!==t.cacheSizeBytes&&t.cacheSizeBytes<1048576)throw new T(E.INVALID_ARGUMENT,"cacheSizeBytes must be at least 1048576");return r.initialize({options:t,instanceIdentifier:n})}function Nc(e,t){const n="object"==typeof e?e:Object(s["e"])(),r="string"==typeof e?e:t||"(default)",i=Object(s["b"])(n,"firestore").getImmediate({identifier:r});if(!i._initialized){const e=Object(a["p"])("firestore");e&&Ic(i,...e)}return i}function Ac(e){return e._firestoreClient||Mc(e),e._firestoreClient.verifyNotTerminated(),e._firestoreClient}function Mc(e){var t,n,r;const s=e._freezeSettings(),i=function(e,t,n,r){return new gt(e,t,n,r.host,r.ssl,r.experimentalForceLongPolling,r.experimentalAutoDetectLongPolling,cc(r.experimentalLongPollingOptions),r.useFetchStreams)}(e._databaseId,(null===(t=e._app)||void 0===t?void 0:t.options.appId)||"",e._persistenceKey,s);e._firestoreClient=new Zu(e._authCredentials,e._appCheckCredentials,e._queue,i),(null===(n=s.localCache)||void 0===n?void 0:n._offlineComponentProvider)&&(null===(r=s.localCache)||void 0===r?void 0:r._onlineComponentProvider)&&(e._firestoreClient._uninitializedComponentsProvider={_offlineKind:s.localCache.kind,_offline:s.localCache._offlineComponentProvider,_online:s.localCache._onlineComponentProvider})}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Rc{constructor(e){this._byteString=e}static fromBase64String(e){try{return new Rc(at.fromBase64String(e))}catch(e){throw new T(E.INVALID_ARGUMENT,"Failed to construct data from Base64 string: "+e)}}static fromUint8Array(e){return new Rc(at.fromUint8Array(e))}toBase64(){return this._byteString.toBase64()}toUint8Array(){return this._byteString.toUint8Array()}toString(){return"Bytes(base64: "+this.toBase64()+")"}isEqual(e){return this._byteString.isEqual(e._byteString)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Vc{constructor(...e){for(let t=0;t<e.length;++t)if(0===e[t].length)throw new T(E.INVALID_ARGUMENT,"Invalid field name at argument $(i + 1). Field names must not be empty.");this._internalPath=new G(e)}isEqual(e){return this._internalPath.isEqual(e._internalPath)}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class Oc{constructor(e){this._methodName=e}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Fc{constructor(e,t){if(!isFinite(e)||e<-90||e>90)throw new T(E.INVALID_ARGUMENT,"Latitude must be a number between -90 and 90, but was: "+e);if(!isFinite(t)||t<-180||t>180)throw new T(E.INVALID_ARGUMENT,"Longitude must be a number between -180 and 180, but was: "+t);this._lat=e,this._long=t}get latitude(){return this._lat}get longitude(){return this._long}isEqual(e){return this._lat===e._lat&&this._long===e._long}toJSON(){return{latitude:this._lat,longitude:this._long}}_compareTo(e){return O(this._lat,e._lat)||O(this._long,e._long)}}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */const Lc=/^__.*__$/;class Pc{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return null!==this.fieldMask?new _r(e,this.data,this.fieldMask,t,this.fieldTransforms):new Tr(e,this.data,t,this.fieldTransforms)}}class Uc{constructor(e,t,n){this.data=e,this.fieldMask=t,this.fieldTransforms=n}toMutation(e,t){return new _r(e,this.data,this.fieldMask,t,this.fieldTransforms)}}function qc(e){switch(e){case 0:case 2:case 1:return!0;case 3:case 4:return!1;default:throw v()}}class Bc{constructor(e,t,n,r,s,i){this.settings=e,this.databaseId=t,this.serializer=n,this.ignoreUndefinedProperties=r,void 0===s&&this.mu(),this.fieldTransforms=s||[],this.fieldMask=i||[]}get path(){return this.settings.path}get fu(){return this.settings.fu}gu(e){return new Bc(Object.assign(Object.assign({},this.settings),e),this.databaseId,this.serializer,this.ignoreUndefinedProperties,this.fieldTransforms,this.fieldMask)}pu(e){var t;const n=null===(t=this.path)||void 0===t?void 0:t.child(e),r=this.gu({path:n,yu:!1});return r.wu(e),r}Su(e){var t;const n=null===(t=this.path)||void 0===t?void 0:t.child(e),r=this.gu({path:n,yu:!1});return r.mu(),r}bu(e){return this.gu({path:void 0,yu:!0})}Du(e){return rl(e,this.settings.methodName,this.settings.Cu||!1,this.path,this.settings.vu)}contains(e){return void 0!==this.fieldMask.find(t=>e.isPrefixOf(t))||void 0!==this.fieldTransforms.find(t=>e.isPrefixOf(t.field))}mu(){if(this.path)for(let e=0;e<this.path.length;e++)this.wu(this.path.get(e))}wu(e){if(0===e.length)throw this.Du("Document fields must not be empty");if(qc(this.fu)&&Lc.test(e))throw this.Du('Document fields cannot begin and end with "__"')}}class zc{constructor(e,t,n){this.databaseId=e,this.ignoreUndefinedProperties=t,this.serializer=n||ha(e)}Fu(e,t,n,r=!1){return new Bc({fu:e,methodName:t,vu:n,path:G.emptyPath(),yu:!1,Cu:r},this.databaseId,this.serializer,this.ignoreUndefinedProperties)}}function Gc(e){const t=e._freezeSettings(),n=ha(e._databaseId);return new zc(e._databaseId,!!t.ignoreUndefinedProperties,n)}function Kc(e,t,n,r,s,i={}){const o=e.Fu(i.merge||i.mergeFields?2:0,t,n,s);Zc("Data must be an object, but it was:",o,r);const a=Yc(r,o);let u,c;if(i.merge)u=new it(o.fieldMask),c=o.fieldTransforms;else if(i.mergeFields){const e=[];for(const r of i.mergeFields){const s=el(t,r,n);if(!o.contains(s))throw new T(E.INVALID_ARGUMENT,`Field '${s}' is specified in your field mask but missing from your input data.`);sl(e,s)||e.push(s)}u=new it(e),c=o.fieldTransforms.filter(e=>u.covers(e.field))}else u=null,c=o.fieldTransforms;return new Pc(new Pt(a),u,c)}class jc extends Oc{_toFieldTransform(e){if(2!==e.fu)throw 1===e.fu?e.Du(this._methodName+"() can only appear at the top level of your update data"):e.Du(this._methodName+"() cannot be used with set() unless you pass {merge:true}");return e.fieldMask.push(e.path),null}isEqual(e){return e instanceof jc}}class $c extends Oc{_toFieldTransform(e){return new dr(e.path,new sr)}isEqual(e){return e instanceof $c}}function Qc(e,t,n,r){const s=e.Fu(1,t,n);Zc("Data must be an object, but it was:",s,r);const i=[],o=Pt.empty();Ye(r,(e,r)=>{const u=nl(t,e,n);r=Object(a["q"])(r);const c=s.Su(u);if(r instanceof jc)i.push(u);else{const e=Jc(r,c);null!=e&&(i.push(u),o.set(u,e))}});const u=new it(i);return new Uc(o,u,s.fieldTransforms)}function Hc(e,t,n,r,s,i){const o=e.Fu(1,t,n),u=[el(t,r,n)],c=[s];if(i.length%2!=0)throw new T(E.INVALID_ARGUMENT,`Function ${t}() needs to be called with an even number of arguments that alternate between field names and values.`);for(let a=0;a<i.length;a+=2)u.push(el(t,i[a])),c.push(i[a+1]);const l=[],h=Pt.empty();for(let f=u.length-1;f>=0;--f)if(!sl(l,u[f])){const e=u[f];let t=c[f];t=Object(a["q"])(t);const n=o.Su(e);if(t instanceof jc)l.push(e);else{const r=Jc(t,n);null!=r&&(l.push(e),h.set(e,r))}}const d=new it(l);return new Uc(h,d,o.fieldTransforms)}function Wc(e,t,n,r=!1){return Jc(n,e.Fu(r?4:3,t))}function Jc(e,t){if(Xc(e=Object(a["q"])(e)))return Zc("Unsupported field value:",t,e),Yc(e,t);if(e instanceof Oc)return function(e,t){if(!qc(t.fu))throw t.Du(e._methodName+"() can only be used with update() and set()");if(!t.path)throw t.Du(e._methodName+"() is not currently supported inside arrays");const n=e._toFieldTransform(t);n&&t.fieldTransforms.push(n)}(e,t),null;if(void 0===e&&t.ignoreUndefinedProperties)return null;if(t.path&&t.fieldMask.push(t.path),e instanceof Array){if(t.settings.yu&&4!==t.fu)throw t.Du("Nested arrays are not supported");return function(e,t){const n=[];let r=0;for(const s of e){let e=Jc(s,t.bu(r));null==e&&(e={nullValue:"NULL_VALUE"}),n.push(e),r++}return{arrayValue:{values:n}}}(e,t)}return function(e,t){if(null===(e=Object(a["q"])(e)))return{nullValue:"NULL_VALUE"};if("number"==typeof e)return Zn(t.serializer,e);if("boolean"==typeof e)return{booleanValue:e};if("string"==typeof e)return{stringValue:e};if(e instanceof Date){const n=P.fromDate(e);return{timestampValue:is(t.serializer,n)}}if(e instanceof P){const n=new P(e.seconds,1e3*Math.floor(e.nanoseconds/1e3));return{timestampValue:is(t.serializer,n)}}if(e instanceof Fc)return{geoPointValue:{latitude:e.latitude,longitude:e.longitude}};if(e instanceof Rc)return{bytesValue:os(t.serializer,e._byteString)};if(e instanceof Ec){const n=t.databaseId,r=e.firestore._databaseId;if(!r.isEqual(n))throw t.Du(`Document reference is for database ${r.projectId}/${r.database} but should be for database ${n.projectId}/${n.database}`);return{referenceValue:cs(e.firestore._databaseId||t.databaseId,e._key.path)}}throw t.Du("Unsupported field value: "+gc(e))}(e,t)}function Yc(e,t){const n={};return Xe(e)?t.path&&t.path.length>0&&t.fieldMask.push(t.path):Ye(e,(e,r)=>{const s=Jc(r,t.pu(e));null!=s&&(n[e]=s)}),{mapValue:{fields:n}}}function Xc(e){return!("object"!=typeof e||null===e||e instanceof Array||e instanceof Date||e instanceof P||e instanceof Fc||e instanceof Rc||e instanceof Ec||e instanceof Oc)}function Zc(e,t,n){if(!Xc(n)||!function(e){return"object"==typeof e&&null!==e&&(Object.getPrototypeOf(e)===Object.prototype||null===Object.getPrototypeOf(e))}(n)){const r=gc(n);throw"an object"===r?t.Du(e+" a custom object"):t.Du(e+" "+r)}}function el(e,t,n){if((t=Object(a["q"])(t))instanceof Vc)return t._internalPath;if("string"==typeof t)return nl(e,t);throw rl("Field path arguments must be of type string or ",e,!1,void 0,n)}const tl=new RegExp("[~\\*/\\[\\]]");function nl(e,t,n){if(t.search(tl)>=0)throw rl(`Invalid field path (${t}). Paths must not contain '~', '*', '/', '[', or ']'`,e,!1,void 0,n);try{return new Vc(...t.split("."))._internalPath}catch(r){throw rl(`Invalid field path (${t}). Paths must not be empty, begin with '.', end with '.', or contain '..'`,e,!1,void 0,n)}}function rl(e,t,n,r,s){const i=r&&!r.isEmpty(),o=void 0!==s;let a=`Function ${t}() called with invalid data`;n&&(a+=" (via `toFirestore()`)"),a+=". ";let u="";return(i||o)&&(u+=" (found",i&&(u+=" in field "+r),o&&(u+=" in document "+s),u+=")"),new T(E.INVALID_ARGUMENT,a+e+u)}function sl(e,t){return e.some(e=>e.isEqual(t))}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class il{constructor(e,t,n,r,s){this._firestore=e,this._userDataWriter=t,this._key=n,this._document=r,this._converter=s}get id(){return this._key.path.lastSegment()}get ref(){return new Ec(this._firestore,this._converter,this._key)}exists(){return null!==this._document}data(){if(this._document){if(this._converter){const e=new ol(this._firestore,this._userDataWriter,this._key,this._document,null);return this._converter.fromFirestore(e)}return this._userDataWriter.convertValue(this._document.data.value)}}get(e){if(this._document){const t=this._document.data.field(al("DocumentSnapshot.get",e));if(null!==t)return this._userDataWriter.convertValue(t)}}}class ol extends il{data(){return super.data()}}function al(e,t){return"string"==typeof t?nl(e,t):t instanceof Vc?t._internalPath:t._delegate._internalPath}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function ul(e){if("L"===e.limitType&&0===e.explicitOrderBy.length)throw new T(E.UNIMPLEMENTED,"limitToLast() queries require specifying at least one orderBy() clause")}class cl{}class ll extends cl{}function hl(e,t,...n){let r=[];t instanceof cl&&r.push(t),r=r.concat(n),function(e){const t=e.filter(e=>e instanceof ml).length,n=e.filter(e=>e instanceof dl).length;if(t>1||t>0&&n>0)throw new T(E.INVALID_ARGUMENT,"InvalidQuery. When using composite filters, you cannot use more than one filter at the top level. Consider nesting the multiple filters within an `and(...)` statement. For example: change `query(query, where(...), or(...))` to `query(query, and(where(...), or(...)))`.")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */(r);for(const s of r)e=s._apply(e);return e}class dl extends ll{constructor(e,t,n){super(),this._field=e,this._op=t,this._value=n,this.type="where"}static _create(e,t,n){return new dl(e,t,n)}_apply(e){const t=this._parse(e);return bl(e._query,t),new bc(e.firestore,e.converter,Dn(e._query,t))}_parse(e){const t=Gc(e.firestore),n=function(e,t,n,r,s,i,o){let a;if(s.isKeyField()){if("array-contains"===i||"array-contains-any"===i)throw new T(E.INVALID_ARGUMENT,`Invalid Query. You can't perform '${i}' queries on documentId().`);if("in"===i||"not-in"===i){Il(o,i);const t=[];for(const n of o)t.push(vl(r,e,n));a={arrayValue:{values:t}}}else a=vl(r,e,o)}else"in"!==i&&"not-in"!==i&&"array-contains-any"!==i||Il(o,i),a=Wc(n,t,o,"in"===i||"not-in"===i);return Qt.create(s,i,a)}(e._query,"where",t,e.firestore._databaseId,this._field,this._op,this._value);return n}}function fl(e,t,n){const r=t,s=al("where",e);return dl._create(s,r,n)}class ml extends cl{constructor(e,t){super(),this.type=e,this._queryConstraints=t}static _create(e,t){return new ml(e,t)}_parse(e){const t=this._queryConstraints.map(t=>t._parse(e)).filter(e=>e.getFilters().length>0);return 1===t.length?t[0]:Ht.create(t,this._getOperator())}_apply(e){const t=this._parse(e);return 0===t.getFilters().length?e:(function(e,t){let n=e;const r=t.getFlattenedFilters();for(const s of r)bl(n,s),n=Dn(n,s)}(e._query,t),new bc(e.firestore,e.converter,Dn(e._query,t)))}_getQueryConstraints(){return this._queryConstraints}_getOperator(){return"and"===this.type?"and":"or"}}class gl extends ll{constructor(e,t){super(),this._field=e,this._direction=t,this.type="orderBy"}static _create(e,t){return new gl(e,t)}_apply(e){const t=function(e,t,n){if(null!==e.startAt)throw new T(E.INVALID_ARGUMENT,"Invalid query. You must not call startAt() or startAfter() before calling orderBy().");if(null!==e.endAt)throw new T(E.INVALID_ARGUMENT,"Invalid query. You must not call endAt() or endBefore() before calling orderBy().");return new Kt(t,n)}(e._query,this._field,this._direction);return new bc(e.firestore,e.converter,function(e,t){const n=e.explicitOrderBy.concat([t]);return new In(e.path,e.collectionGroup,n,e.filters.slice(),e.limit,e.limitType,e.startAt,e.endAt)}(e._query,t))}}function pl(e,t="asc"){const n=t,r=al("orderBy",e);return gl._create(r,n)}class yl extends ll{constructor(e,t,n){super(),this.type=e,this._limit=t,this._limitType=n}static _create(e,t,n){return new yl(e,t,n)}_apply(e){return new bc(e.firestore,e.converter,kn(e._query,this._limit,this._limitType))}}function wl(e){return yc("limit",e),yl._create("limit",e,"F")}function vl(e,t,n){if("string"==typeof(n=Object(a["q"])(n))){if(""===n)throw new T(E.INVALID_ARGUMENT,"Invalid query. When querying with documentId(), you must provide a valid document ID, but it was an empty string.");if(!_n(t)&&-1!==n.indexOf("/"))throw new T(E.INVALID_ARGUMENT,`Invalid query. When querying a collection by documentId(), you must provide a plain document ID, but '${n}' contains a '/' character.`);const r=t.path.child(B.fromString(n));if(!K.isDocumentKey(r))throw new T(E.INVALID_ARGUMENT,`Invalid query. When querying a collection group by documentId(), the value provided must result in a valid document path, but '${r}' is not because it has an odd number of segments (${r.length}).`);return xt(e,new K(r))}if(n instanceof Ec)return xt(e,n._key);throw new T(E.INVALID_ARGUMENT,`Invalid query. When querying with documentId(), you must provide a valid string or a DocumentReference, but it was: ${gc(n)}.`)}function Il(e,t){if(!Array.isArray(e)||0===e.length)throw new T(E.INVALID_ARGUMENT,`Invalid Query. A non-empty array is required for '${t.toString()}' filters.`)}function bl(e,t){const n=function(e,t){for(const n of e)for(const e of n.getFlattenedFilters())if(t.indexOf(e.op)>=0)return e.op;return null}(e.filters,function(e){switch(e){case"!=":return["!=","not-in"];case"array-contains-any":case"in":return["not-in"];case"not-in":return["array-contains-any","in","not-in","!="];default:return[]}}(t.op));if(null!==n)throw n===t.op?new T(E.INVALID_ARGUMENT,`Invalid query. You cannot use more than one '${t.op.toString()}' filter.`):new T(E.INVALID_ARGUMENT,`Invalid query. You cannot use '${t.op.toString()}' filters with '${n.toString()}' filters.`)}class El{convertValue(e,t="none"){switch(vt(e)){case 0:return null;case 1:return e.booleanValue;case 2:return lt(e.integerValue||e.doubleValue);case 3:return this.convertTimestamp(e.timestampValue);case 4:return this.convertServerTimestamp(e,t);case 5:return e.stringValue;case 6:return this.convertBytes(ht(e.bytesValue));case 7:return this.convertReference(e.referenceValue);case 8:return this.convertGeoPoint(e.geoPointValue);case 9:return this.convertArray(e.arrayValue,t);case 10:return this.convertObject(e.mapValue,t);default:throw v()}}convertObject(e,t){return this.convertObjectMap(e.fields,t)}convertObjectMap(e,t="none"){const n={};return Ye(e,(e,r)=>{n[e]=this.convertValue(r,t)}),n}convertGeoPoint(e){return new Fc(lt(e.latitude),lt(e.longitude))}convertArray(e,t){return(e.values||[]).map(e=>this.convertValue(e,t))}convertServerTimestamp(e,t){switch(t){case"previous":const n=ft(e);return null==n?null:this.convertValue(n,t);case"estimate":return this.convertTimestamp(mt(e));default:return null}}convertTimestamp(e){const t=ct(e);return new P(t.seconds,t.nanos)}convertDocumentKey(e,t){const n=B.fromString(e);I(Fs(n));const r=new pt(n.get(1),n.get(3)),s=new K(n.popFirst(5));return r.isEqual(t)||p(`Document ${s} contains a document reference within a different database (${r.projectId}/${r.database}) which is not supported. It will be treated as a reference in the current database (${t.projectId}/${t.database}) instead.`),s}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Tl(e,t,n){let r;return r=e?n&&(n.merge||n.mergeFields)?e.toFirestore(t,n):e.toFirestore(t):t,r}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class _l{constructor(e,t){this.hasPendingWrites=e,this.fromCache=t}isEqual(e){return this.hasPendingWrites===e.hasPendingWrites&&this.fromCache===e.fromCache}}class Sl extends il{constructor(e,t,n,r,s,i){super(e,t,n,r,i),this._firestore=e,this._firestoreImpl=e,this.metadata=s}exists(){return super.exists()}data(e={}){if(this._document){if(this._converter){const t=new xl(this._firestore,this._userDataWriter,this._key,this._document,this.metadata,null);return this._converter.fromFirestore(t,e)}return this._userDataWriter.convertValue(this._document.data.value,e.serverTimestamps)}}get(e,t={}){if(this._document){const n=this._document.data.field(al("DocumentSnapshot.get",e));if(null!==n)return this._userDataWriter.convertValue(n,t.serverTimestamps)}}}class xl extends Sl{data(e={}){return super.data(e)}}class Cl{constructor(e,t,n,r){this._firestore=e,this._userDataWriter=t,this._snapshot=r,this.metadata=new _l(r.hasPendingWrites,r.fromCache),this.query=n}get docs(){const e=[];return this.forEach(t=>e.push(t)),e}get size(){return this._snapshot.docs.size}get empty(){return 0===this.size}forEach(e,t){this._snapshot.docs.forEach(n=>{e.call(t,new xl(this._firestore,this._userDataWriter,n.key,n,new _l(this._snapshot.mutatedKeys.has(n.key),this._snapshot.fromCache),this.query.converter))})}docChanges(e={}){const t=!!e.includeMetadataChanges;if(t&&this._snapshot.excludesMetadataChanges)throw new T(E.INVALID_ARGUMENT,"To include metadata changes with your document changes, you must also pass { includeMetadataChanges:true } to onSnapshot().");return this._cachedChanges&&this._cachedChangesIncludeMetadataChanges===t||(this._cachedChanges=function(e,t){if(e._snapshot.oldDocs.isEmpty()){let t=0;return e._snapshot.docChanges.map(n=>{const r=new xl(e._firestore,e._userDataWriter,n.doc.key,n.doc,new _l(e._snapshot.mutatedKeys.has(n.doc.key),e._snapshot.fromCache),e.query.converter);return n.doc,{type:"added",doc:r,oldIndex:-1,newIndex:t++}})}{let n=e._snapshot.oldDocs;return e._snapshot.docChanges.filter(e=>t||3!==e.type).map(t=>{const r=new xl(e._firestore,e._userDataWriter,t.doc.key,t.doc,new _l(e._snapshot.mutatedKeys.has(t.doc.key),e._snapshot.fromCache),e.query.converter);let s=-1,i=-1;return 0!==t.type&&(s=n.indexOf(t.doc.key),n=n.delete(t.doc.key)),1!==t.type&&(n=n.add(t.doc),i=n.indexOf(t.doc.key)),{type:Dl(t.type),doc:r,oldIndex:s,newIndex:i}})}}(this,t),this._cachedChangesIncludeMetadataChanges=t),this._cachedChanges}}function Dl(e){switch(e){case 0:return"added";case 2:case 3:return"modified";case 1:return"removed";default:return v()}}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function kl(e){e=pc(e,Ec);const t=pc(e.firestore,Dc);return ac(Ac(t),e._key).then(n=>Pl(t,e,n))}class Nl extends El{constructor(e){super(),this.firestore=e}convertBytes(e){return new Rc(e)}convertReference(e){const t=this.convertDocumentKey(e,this.firestore._databaseId);return new Ec(this.firestore,null,t)}}function Al(e){e=pc(e,bc);const t=pc(e.firestore,Dc),n=Ac(t),r=new Nl(t);return ul(e._query),uc(n,e._query).then(n=>new Cl(t,r,e,n))}function Ml(e,t,n){e=pc(e,Ec);const r=pc(e.firestore,Dc),s=Tl(e.converter,t,n);return Ll(r,[Kc(Gc(r),"setDoc",e._key,s,null!==e.converter,n).toMutation(e._key,gr.none())])}function Rl(e,t,n,...r){e=pc(e,Ec);const s=pc(e.firestore,Dc),i=Gc(s);let o;return o="string"==typeof(t=Object(a["q"])(t))||t instanceof Vc?Hc(i,"updateDoc",e._key,t,n,r):Qc(i,"updateDoc",e._key,t),Ll(s,[o.toMutation(e._key,gr.exists(!0))])}function Vl(e){return Ll(pc(e.firestore,Dc),[new Dr(e._key,gr.none())])}function Ol(e,t){const n=pc(e.firestore,Dc),r=Sc(e),s=Tl(e.converter,t);return Ll(n,[Kc(Gc(e.firestore),"addDoc",r._key,s,null!==e.converter,{}).toMutation(r._key,gr.exists(!1))]).then(()=>r)}function Fl(e,...t){var n,r,s;e=Object(a["q"])(e);let i={includeMetadataChanges:!1,source:"default"},o=0;"object"!=typeof t[o]||Cc(t[o])||(i=t[o],o++);const u={includeMetadataChanges:i.includeMetadataChanges,source:i.source};if(Cc(t[o])){const e=t[o];t[o]=null===(n=e.next)||void 0===n?void 0:n.bind(e),t[o+1]=null===(r=e.error)||void 0===r?void 0:r.bind(e),t[o+2]=null===(s=e.complete)||void 0===s?void 0:s.bind(e)}let c,l,h;if(e instanceof Ec)l=pc(e.firestore,Dc),h=En(e._key.path),c={next:n=>{t[o]&&t[o](Pl(l,e,n))},error:t[o+1],complete:t[o+2]};else{const n=pc(e,bc);l=pc(n.firestore,Dc),h=n._query;const r=new Nl(l);c={next:e=>{t[o]&&t[o](new Cl(l,r,n,e))},error:t[o+1],complete:t[o+2]},ul(e._query)}return function(e,t,n,r){const s=new Xu(r),i=new uu(t,s,n);return e.asyncQueue.enqueueAndForget(async()=>tu(await oc(e),i)),()=>{s.$a(),e.asyncQueue.enqueueAndForget(async()=>nu(await oc(e),i))}}(Ac(l),h,u,c)}function Ll(e,t){return function(e,t){const n=new _;return e.asyncQueue.enqueueAndForget(async()=>bu(await ic(e),t,n)),n.promise}(Ac(e),t)}function Pl(e,t,n){const r=n.docs.get(t._key),s=new Nl(e);return new Sl(e,s,t._key,r,new _l(n.hasPendingWrites,n.fromCache),t.converter)}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */class Ul{constructor(e){let t;this.kind="persistent",(null==e?void 0:e.tabManager)?(e.tabManager._initialize(e),t=e.tabManager):(t=Gl(void 0),t._initialize(e)),this._onlineComponentProvider=t._onlineComponentProvider,this._offlineComponentProvider=t._offlineComponentProvider}toJSON(){return{kind:this.kind}}}function ql(e){return new Ul(e)}class Bl{constructor(e){this.forceOwnership=e,this.kind="persistentSingleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=new Yu,this._offlineComponentProvider=new Wu(this._onlineComponentProvider,null==e?void 0:e.cacheSizeBytes,this.forceOwnership)}}class zl{constructor(){this.kind="PersistentMultipleTab"}toJSON(){return{kind:this.kind}}_initialize(e){this._onlineComponentProvider=new Yu,this._offlineComponentProvider=new Ju(this._onlineComponentProvider,null==e?void 0:e.cacheSizeBytes)}}function Gl(e){return new Bl(null==e?void 0:e.forceOwnership)}function Kl(){return new zl}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
class jl{constructor(e,t){this._firestore=e,this._commitHandler=t,this._mutations=[],this._committed=!1,this._dataReader=Gc(e)}set(e,t,n){this._verifyNotCommitted();const r=$l(e,this._firestore),s=Tl(r.converter,t,n),i=Kc(this._dataReader,"WriteBatch.set",r._key,s,null!==r.converter,n);return this._mutations.push(i.toMutation(r._key,gr.none())),this}update(e,t,n,...r){this._verifyNotCommitted();const s=$l(e,this._firestore);let i;return i="string"==typeof(t=Object(a["q"])(t))||t instanceof Vc?Hc(this._dataReader,"WriteBatch.update",s._key,t,n,r):Qc(this._dataReader,"WriteBatch.update",s._key,t),this._mutations.push(i.toMutation(s._key,gr.exists(!0))),this}delete(e){this._verifyNotCommitted();const t=$l(e,this._firestore);return this._mutations=this._mutations.concat(new Dr(t._key,gr.none())),this}commit(){return this._verifyNotCommitted(),this._committed=!0,this._mutations.length>0?this._commitHandler(this._mutations):Promise.resolve()}_verifyNotCommitted(){if(this._committed)throw new T(E.FAILED_PRECONDITION,"A write batch can no longer be used after commit() has been called.")}}function $l(e,t){if((e=Object(a["q"])(e)).firestore!==t)throw new T(E.INVALID_ARGUMENT,"Provided document reference is from a different Firestore instance.");return e}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */function Ql(){return new $c("serverTimestamp")}
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function Hl(e){return Ac(e=pc(e,Dc)),new jl(e,t=>Ll(e,t))
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */}new WeakMap;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */!function(e,t=!0){!function(e){d=e}(s["a"]),Object(s["c"])(new i["a"]("firestore",(e,{instanceIdentifier:n,options:r})=>{const s=e.getProvider("app").getImmediate(),i=new Dc(new D(e.getProvider("auth-internal")),new M(e.getProvider("app-check-internal")),function(e,t){if(!Object.prototype.hasOwnProperty.apply(e.options,["projectId"]))throw new T(E.INVALID_ARGUMENT,'"projectId" not provided in firebase.initializeApp.');return new pt(e.options.projectId,t)}(s,n),s);return r=Object.assign({useFetchStreams:t},r),i._setSettings(r),i},"PUBLIC").setMultipleInstances(!0)),Object(s["g"])(l,"4.6.4",e),Object(s["g"])(l,"4.6.4","esm2017")}()}).call(this,n("4362"),n("b639").Buffer)}}]);