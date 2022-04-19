// import React from 'react';
// import { render } from 'react-dom';
import axios from 'axios';
import adapter from '../fetch';
const CancelToken = axios.CancelToken;
let cancelGet, cancelPost;

const axiosFetch = axios.create({
  adapter,
  // timeout: 500,
});

const fetchGetEl = window.document.getElementById('fetchGet');
const cancelGetEl = window.document.getElementById('cancelGet');
const fetchPostEl = window.document.getElementById('fetchPost');
const cancelPostEl = window.document.getElementById('cancelPost');

// 请求get
fetchGetEl.addEventListener('click', function () {
  axiosFetch
    .get(
      'https://www.fastmock.site/mock/f3feaaceec0de8d1a32084308143c624/ceshi1/login',
      {
        cancelToken: new CancelToken(function executor(c) {
          // executor 函数接收一个 cancel 函数作为参数
          cancelGet = c;
        }),
      }
    )
    .then((res) => {
      console.log('fetchGet-res', res);
    })
    .catch((err) => {
      console.log('fetchGet-err', err);
    });
});
// 取消请求get
cancelGetEl.addEventListener('click', function () {
  cancelGet('我取消了请求');
});

// 请求post
fetchPostEl.addEventListener('click', function () {
  axiosFetch
    .post(
      'https://www.fastmock.site/mock/f3feaaceec0de8d1a32084308143c624/ceshi1/success',
      {
        size: 10,
        start: 1,
      },
      {
        cancelToken: new CancelToken(function executor(c) {
          // executor 函数接收一个 cancel 函数作为参数
          cancelPost = c;
        }),
      }
    )
    .then((res) => {
      console.log('fetchPost-res', res);
    })
    .catch((err) => {
      console.log('fetchPost-err', err);
    });
});
// 取消请求post
cancelPostEl.addEventListener('click', function () {
  cancelPost();
});