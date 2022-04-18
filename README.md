# 为什么会写这个

平时工作中一般是用axios, 对其方法属性都比较熟悉了, 而且项目中的相关配置也比较庞大. 现在想使用fetch方法代替XMLHttpRequest, 就想在axios的基础上增加对fetch的支持, 所以写了这个对于fetch的适配器, 无需改动原来的axios接口逻辑, 任何属性方法都是一致且支持的(除了上传进度,这个fetch不支持)

# 安装和使用

安装axios和这个适配器

```
npm install axios
npm install axios-adapter-fetch
```

两种方式都可使用(关键在于adapter, 这个即是axios对应fetch的适配器):

1.  创建Axios的新实例，并在配置中传递此适配器

```
import adapter from 'axios-adapter-fetch';

const instance = axios.create({
  baseURL: 'https://some-domain.com/api/',
  timeout: 1000,
  adapter
  ....
});
```

2.   在每个请求中传递此适配器

```
import adapter from 'axios-adapter-fetch';

axios.request({
  url: '/user',
  method: 'get',
  adapter
  ...
})
```

# 注:

- 这个适配器依赖于fetch API, 所以在nodejs中使用前提需要nodejs支持fetch API