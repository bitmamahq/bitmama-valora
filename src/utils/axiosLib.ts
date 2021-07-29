import axios from "axios";

const get = async (endpoint: string, headers = {}) => {
  try {
    const req = await axios.get(endpoint, { headers });
    return Promise.resolve({ status: req.status, data: req.data });
  } catch (err) {
    return Promise.reject(err);
  }
};

const post = async (endpoint: string, data = {}, headers = {}) => {
  try {
    const req = await axios.post(endpoint, data, { headers });
    return Promise.resolve({ status: req.status, data: req.data });
  } catch (err) {
    return Promise.reject(err);
  }
};

const put = async (endpoint: string, data = {}, headers = {}) => {
  try {
    const req = await axios.put(endpoint, data, { headers });
    return Promise.resolve({ status: req.status, data: req.data });
  } catch (err) {
    return Promise.reject(err);
  }
};

const del = async (endpoint: string, headers = {}) => {
  try {
    const req = await axios.delete(endpoint, { headers });
    return Promise.resolve({ status: req.status, data: req.data });
  } catch (err) {
    return Promise.reject(err);
  }
};

export { get, post, put, del };
