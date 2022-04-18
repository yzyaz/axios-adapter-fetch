'use strict';

var utils = require('axios/lib/utils');
var settle = require('axios/lib/core/settle');
var cookies = require('axios/lib/helpers/cookies');
var buildURL = require('axios/lib/helpers/buildURL');
var buildFullPath = require('axios/lib/core/buildFullPath');
var isURLSameOrigin = require('axios/lib/helpers/isURLSameOrigin');
var createError = require('axios/lib/core/createError');

module.exports = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    // `data` 是作为请求主体被发送的数据
    // 只适用于这些请求方法 'PUT', 'POST', 和 'PATCH'
    // 在没有设置 `transformRequest` 时，必须是以下类型之一：
    // - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
    // - 浏览器专属：FormData, File, Blob
    // - Node 专属： Stream
    var requestData = config.data;
    // `headers` 是即将被发送的自定义请求头
    var requestHeaders = config.headers;
    // `responseType` 表示服务器响应的数据类型，可以是 'arraybuffer', 'blob', 'document', 'json', 'text', 'stream'
    var responseType = config.responseType;
    // 是否正在请求中
    let reqing = false;
    // 取消请求相关
    let controller;
    // 取消请求相关
    let signal;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password
        ? unescape(encodeURIComponent(config.auth.password))
        : '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    // 处理header
    utils.forEach(requestHeaders, function setRequestHeader(val, key) {
      if (
        typeof requestData === 'undefined' &&
        key.toLowerCase() === 'content-type'
      ) {
        // Remove Content-Type if data is undefined
        delete requestHeaders[key];
      }
    });

    var fullPath = buildFullPath(config.baseURL, config.url);

    // `xsrfHeaderName` is the name of the http header that carries the xsrf token value
    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      // Add xsrf header
      var xsrfValue =
        (config.withCredentials || isURLSameOrigin(fullPath)) &&
        config.xsrfCookieName
          ? cookies.read(config.xsrfCookieName)
          : undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // 组合fetch的请求参数
    const method = config.method.toUpperCase();
    var fetchOptions = {
      method,
      headers: requestHeaders,
    };

    // 转化data数据
    if (requestData && method !== 'GET' && method !== 'HEAD') {
      fetchOptions.body = requestData;
    }

    // 跨域是否携带凭证, `withCredentials` 表示跨域请求时是否需要使用凭证, 默认是same-origin
    if (!utils.isUndefined(config.withCredentials)) {
      fetchOptions.credentials = config.withCredentials ? 'include' : 'omit';
    }
    // // 下载进度
    // if (typeof config.onDownloadProgress === 'function') {
    //   config.onDownloadProgress;
    // }

    // // 上传进度
    // if (typeof config.onUploadProgress === 'function' && fetchOptions.upload) {
    //   fetchOptions.upload.addEventListener('progress', config.onUploadProgress);
    // }

    // fetch接口的独特配置, 详见https://developer.mozilla.org/zh-CN/docs/Web/API/fetch
    if (config.mode) {
      fetchOptions.mode = config.mode;
    }
    if (config.cache) {
      fetchOptions.cache = config.cache;
    }
    if (config.integrity) {
      fetchOptions.integrity = config.integrity;
    }
    if (config.redirect) {
      fetchOptions.integrity = config.redirect;
    }
    if (config.referrer) {
      fetchOptions.referrer = config.referrer;
    }

    // 取消请求相关
    if (config.cancelToken) {
      controller = new AbortController();
      signal = controller.signal;
      fetchOptions.signal = signal;
    }

    // 上传进度暂不支持
    // const onUploadProgress = async (fetchReq) => {
    //   if (typeof config.onUploadProgress !== 'function') return;
    //   // Step 1: start the fetch and obtain a reader
    //   const reader = fetchReq.clone().body.getReader(); // 这里body为null,走不通

    //   // Step 2: get total length
    //   const contentLength = +fetchReq.headers.get('Content-Length');

    //   // Step 3: read the data
    //   let receivedLength = 0; // received that many bytes at the moment
    //   let chunks = []; // array of received binary chunks (comprises the body)
    //   while (true) {
    //     const { done, value } = await reader.read();
    //     if (done) break;
    //     chunks.push(value);
    //     receivedLength += value.length;
    //     config.onUploadProgress({
    //       loaded: receivedLength,
    //       total: contentLength,
    //     });
    //   }
    // };

    // 下载进度
    const onDownloadProgress = async (fetchRes) => {
      if (typeof config.onDownloadProgress !== 'function') return;

      // Step 1: start the fetch and obtain a reader
      const reader = fetchRes.clone().body.getReader();

      // Step 2: get total length
      const contentLength = +fetchRes.headers.get('Content-Length');

      // Step 3: read the data
      let receivedLength = 0; // received that many bytes at the moment
      let chunks = []; // array of received binary chunks (comprises the body)
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        config.onDownloadProgress({
          loaded: receivedLength,
          total: contentLength,
        });
      }
    };

    // fetch请求接口函数
    async function fetchFun(url, init) {
      let fetchRes;
      let response = {
        status: null,
        statusText: null,
        headers: null,
        config: config,
        request: null,
      };
      reqing = true;
      const paramsRequest = new Request(url, init);
      // 上传进度暂不支持
      // onUploadProgress(paramsRequest);
      try {
        fetchRes = await fetch(paramsRequest);
      } catch (error) {
        reject(createError('Network Error', config, null, null));
        return;
      } finally {
        reqing = false;
      }

      // 下载进度
      onDownloadProgress(fetchRes);

      response = {
        status: fetchRes.status,
        statusText: fetchRes.statusText,
        headers: Object.fromEntries(fetchRes.headers),
        config: config,
        request: fetchRes,
      };
      if (fetchRes.ok && fetchRes.status !== 204) {
        switch (responseType) {
          case 'arraybuffer':
            response.data = await fetchRes.arrayBuffer();
            break;
          case 'blob':
            response.data = await fetchRes.blob();
            break;
          case 'json':
            response.data = await fetchRes.json();
            break;
          case 'formData':
            response.data = await fetchRes.formData();
            break;
          default:
            response.data = await fetchRes.text();
            break;
        }
      }

      // 条件判断, 是否返回正确或错误promise状态
      settle(resolve, reject, response);
    }

    // 取消请求
    if (config.cancelToken) {
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!reqing) {
          return;
        }
        controller.abort();
        reject(cancel);
      });
    }

    // promise链,用Promise.race执行返回先执行那个
    let promiseChain = [
      fetchFun(
        buildURL(fullPath, config.params, config.paramsSerializer),
        fetchOptions
      ),
    ];

    // 超时处理
    if (config.timeout && config.timeout > 0) {
      promiseChain.push(
        setTimeout(() => {
          var timeoutErrorMessage = config.timeout
            ? 'timeout of ' + config.timeout + 'ms exceeded'
            : 'timeout exceeded';
          var transitional = config.transitional || {};
          if (config.timeoutErrorMessage) {
            timeoutErrorMessage = config.timeoutErrorMessage;
          }
          // 取消请求
          controller.abort();
          // 超时返回错误
          resolve(
            createError(
              timeoutErrorMessage,
              config,
              transitional.clarifyTimeoutError ? 'ETIMEDOUT' : 'ECONNABORTED',
              null
            )
          );
        }, config.timeout)
      );
    }

    try {
      Promise.race(promiseChain);
    } catch (error) {}
  });
};
