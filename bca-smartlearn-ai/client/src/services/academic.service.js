import { api, buildQuery, getData, getPage } from '../lib/api';

/** Public academic catalogue — universities, programs, semesters, subjects, units, topics. */
export const academicService = {
  catalogue: (params) => getData(`/academic/catalogue${buildQuery(params)}`),
  semesters: (params) => getData(`/academic/semesters${buildQuery(params)}`),
  subjects: (params) => getPage(`/academic/subjects${buildQuery(params)}`),
  subject: (id) => getData(`/academic/subjects/${id}`),
  units: (params) => getData(`/academic/units${buildQuery(params)}`),
  topics: (params) => getPage(`/academic/topics${buildQuery(params)}`),
  search: (params) => getData(`/academic/search${buildQuery(params)}`),
};

export default academicService;
