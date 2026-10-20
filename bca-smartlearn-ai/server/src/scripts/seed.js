'use strict';

/**
 * Development seed data.
 *
 *   npm run seed
 *
 * Populates a realistic BCA academic structure (university -> college -> program
 * -> regulation -> semesters -> subjects -> units -> topics), a grading scheme,
 * a coding exercise bank, a question bank, admin note templates and a demo
 * student so every feature has real data to work with.
 *
 * Safe to re-run: every record is upserted on a natural key.
 * Refuses to run when NODE_ENV=production.
 */

const { env, isProduction } = require('../config/env');
const { connectDatabase, disconnectDatabase } = require('../config/db');
const {
  User,
  StudentProfile,
  StudentEnrollment,
  University,
  College,
  AcademicProgram,
  AcademicRegulation,
  Semester,
  Subject,
  Unit,
  Topic,
  GradingScheme,
  NoteTemplate,
  CodingExercise,
  Question,
} = require('../models');
const { ROLES, ACCOUNT_STATUS } = require('../config/constants');
const logger = require('../config/logger');

/* ------------------------------------------------------------------ data --- */

const GRADE_BANDS = [
  { grade: 'O', minPercent: 90, maxPercent: 100, points: 10, description: 'Outstanding' },
  { grade: 'A+', minPercent: 80, maxPercent: 89, points: 9, description: 'Excellent' },
  { grade: 'A', minPercent: 70, maxPercent: 79, points: 8, description: 'Very good' },
  { grade: 'B+', minPercent: 60, maxPercent: 69, points: 7, description: 'Good' },
  { grade: 'B', minPercent: 50, maxPercent: 59, points: 6, description: 'Above average' },
  { grade: 'C', minPercent: 40, maxPercent: 49, points: 5, description: 'Average' },
  { grade: 'F', minPercent: 0, maxPercent: 39, points: 0, description: 'Fail - reappear' },
];

const SYLLABUS = [
  {
    semester: 1,
    subjects: [
      {
        name: 'Computer Fundamentals & Problem Solving',
        code: 'BCA101',
        type: 'theory',
        credits: 4,
        color: '#6366f1',
        icon: 'cpu',
        units: [
          {
            title: 'Introduction to Computers',
            topics: [
              { title: 'Characteristics and generations of computers' },
              { title: 'Block diagram and functional units of a computer' },
              { title: 'Classification of computers: micro, mini, mainframe, super' },
              { title: 'Applications of computers in modern society' },
            ],
          },
          {
            title: 'Number Systems and Data Representation',
            topics: [
              { title: 'Binary, octal, decimal and hexadecimal number systems' },
              { title: 'Conversions between number systems' },
              { title: 'Signed number representation and 1s/2s complement', difficulty: 'hard' },
              { title: 'Character representation: ASCII, EBCDIC, Unicode' },
            ],
          },
          {
            title: 'Input, Output and Storage Devices',
            topics: [
              { title: 'Keyboard, mouse, scanner and other input devices' },
              { title: 'Monitors, printers and plotters' },
              { title: 'Primary memory: RAM, ROM and cache' },
              { title: 'Secondary storage: magnetic, optical and solid state' },
            ],
          },
          {
            title: 'Problem Solving and Algorithms',
            topics: [
              { title: 'Algorithm definition, characteristics and examples' },
              { title: 'Flowcharts and pseudocode' },
              { title: 'Compilation, interpretation and linking' },
              { title: 'Introduction to operating systems and software types' },
            ],
          },
        ],
      },
      {
        name: 'Programming in C',
        code: 'BCA102',
        type: 'both',
        credits: 4,
        color: '#0ea5e9',
        icon: 'code',
        units: [
          {
            title: 'C Fundamentals',
            topics: [
              { title: 'History and features of C', difficulty: 'easy' },
              { title: 'Structure of a C program and compilation steps' },
              { title: 'Data types, variables and constants' },
              { title: 'Operators and expressions' },
            ],
          },
          {
            title: 'Control Structures',
            topics: [
              { title: 'Decision making: if, if-else, nested if, switch' },
              { title: 'Looping: while, do-while and for' },
              { title: 'Jump statements: break, continue and goto' },
              { title: 'Writing and tracing iterative algorithms', difficulty: 'hard' },
            ],
          },
          {
            title: 'Arrays, Strings and Pointers',
            topics: [
              { title: 'One and two dimensional arrays' },
              { title: 'String handling and standard string functions' },
              { title: 'Pointer declaration, arithmetic and pointer to array', difficulty: 'hard' },
              { title: 'Dynamic memory allocation: malloc, calloc, realloc, free' },
            ],
          },
          {
            title: 'Functions, Structures and Files',
            topics: [
              { title: 'Function definition, prototypes and parameter passing' },
              { title: 'Recursion and storage classes' },
              { title: 'Structures, unions and typedef' },
              { title: 'File handling in C: fopen, fclose, fread, fwrite' },
            ],
          },
        ],
      },
      {
        name: 'Mathematics for Computing',
        code: 'BCA103',
        type: 'theory',
        credits: 4,
        color: '#f59e0b',
        icon: 'sigma',
        units: [
          {
            title: 'Sets, Relations and Functions',
            topics: [
              { title: 'Set operations and Venn diagrams' },
              { title: 'Relations and their properties' },
              { title: 'Functions: injective, surjective and bijective' },
            ],
          },
          {
            title: 'Matrices and Determinants',
            topics: [
              { title: 'Matrix algebra and types of matrices' },
              { title: 'Determinants and their properties' },
              { title: 'Inverse of a matrix and solving linear equations' },
            ],
          },
          {
            title: 'Boolean Algebra and Logic',
            topics: [
              { title: 'Boolean laws and simplification' },
              { title: 'Karnaugh maps' },
              { title: 'Logic gates and truth tables' },
            ],
          },
          {
            title: 'Sequences and Series',
            topics: [
              { title: 'Arithmetic and geometric progressions' },
              { title: 'Summation of series' },
              { title: 'Introduction to permutations and combinations' },
            ],
          },
        ],
      },
      {
        name: 'Digital Computer Electronics',
        code: 'BCA104',
        type: 'theory',
        credits: 3,
        color: '#10b981',
        icon: 'circuit-board',
        units: [
          {
            title: 'Semiconductor Devices',
            topics: [
              { title: 'PN junction diode and its characteristics' },
              { title: 'Bipolar junction transistor as a switch' },
              { title: 'Logic families: TTL and CMOS' },
            ],
          },
          {
            title: 'Combinational Logic Circuits',
            topics: [
              { title: 'Half adder, full adder and subtractor' },
              { title: 'Multiplexers and demultiplexers' },
              { title: 'Encoders and decoders' },
            ],
          },
          {
            title: 'Sequential Logic Circuits',
            topics: [
              { title: 'Flip-flops: SR, JK, D and T' },
              { title: 'Registers and counters' },
              { title: 'Memory organisation: ROM and RAM' },
            ],
          },
        ],
      },
      {
        name: 'Business Communication & English',
        code: 'BCA105',
        type: 'theory',
        credits: 2,
        color: '#ec4899',
        icon: 'message-square',
        units: [
          {
            title: 'Fundamentals of Communication',
            topics: [
              { title: 'Process, elements and barriers of communication' },
              { title: 'Verbal and non-verbal communication' },
              { title: 'Listening skills and effective feedback' },
            ],
          },
          {
            title: 'Business Writing',
            topics: [
              { title: 'Letters, notices, memos and emails' },
              { title: 'Report writing and summarising' },
              { title: 'Resume and cover letter preparation' },
            ],
          },
          {
            title: 'Grammar and Vocabulary',
            topics: [
              { title: 'Tenses, articles and prepositions' },
              { title: 'Sentence correction and punctuation' },
              { title: 'Common technical vocabulary' },
            ],
          },
        ],
      },
    ],
  },
  {
    semester: 2,
    subjects: [
      {
        name: 'Data Structures using C',
        code: 'BCA201',
        type: 'both',
        credits: 4,
        color: '#8b5cf6',
        icon: 'git-branch',
        units: [
          {
            title: 'Linear Data Structures',
            topics: [
              { title: 'Arrays, linked lists: singly, doubly and circular' },
              { title: 'Stack and its applications', difficulty: 'medium' },
              { title: 'Queue, circular queue and deque' },
            ],
          },
          {
            title: 'Searching and Sorting',
            topics: [
              { title: 'Linear and binary search' },
              { title: 'Bubble, selection and insertion sort' },
              { title: 'Merge sort and quick sort', difficulty: 'hard' },
            ],
          },
          {
            title: 'Trees',
            topics: [
              { title: 'Binary tree representation and traversals' },
              { title: 'Binary search tree operations' },
              { title: 'AVL trees and balancing', difficulty: 'hard' },
            ],
          },
          {
            title: 'Graphs and Hashing',
            topics: [
              { title: 'Graph representation and traversal: BFS and DFS' },
              { title: 'Shortest path algorithms' },
              { title: 'Hash functions and collision resolution' },
            ],
          },
        ],
      },
      {
        name: 'Object Oriented Concepts',
        code: 'BCA202',
        type: 'theory',
        credits: 3,
        color: '#ef4444',
        icon: 'boxes',
        units: [
          {
            title: 'Object Oriented Foundations',
            topics: [
              { title: 'Procedural vs object oriented programming' },
              { title: 'Classes, objects and encapsulation' },
              { title: 'Abstraction and information hiding' },
            ],
          },
          {
            title: 'Inheritance and Polymorphism',
            topics: [
              { title: 'Types of inheritance' },
              { title: 'Method overloading and overriding' },
              { title: 'Abstract classes and interfaces' },
            ],
          },
          {
            title: 'UML and Design',
            topics: [
              { title: 'Class and object diagrams' },
              { title: 'Use case and sequence diagrams' },
              { title: 'Introduction to design patterns' },
            ],
          },
        ],
      },
      {
        name: 'Discrete Mathematics',
        code: 'BCA203',
        type: 'theory',
        credits: 4,
        color: '#14b8a6',
        icon: 'sigma',
        units: [
          {
            title: 'Mathematical Logic',
            topics: [
              { title: 'Propositional logic and connectives' },
              { title: 'Predicates and quantifiers' },
              { title: 'Proof techniques: direct, contrapositive, induction' },
            ],
          },
          {
            title: 'Combinatorics and Recurrence',
            topics: [
              { title: 'Permutations and combinations' },
              { title: 'Pigeonhole principle' },
              { title: 'Recurrence relations and generating functions' },
            ],
          },
          {
            title: 'Graph Theory',
            topics: [
              { title: 'Graph terminology and isomorphism' },
              { title: 'Euler and Hamiltonian paths' },
              { title: 'Trees and spanning trees' },
            ],
          },
        ],
      },
      {
        name: 'Operating Systems',
        code: 'BCA204',
        type: 'theory',
        credits: 4,
        color: '#f97316',
        icon: 'hard-drive',
        units: [
          {
            title: 'Operating System Fundamentals',
            topics: [
              { title: 'Functions, types and evolution of operating systems' },
              { title: 'System calls and kernel modes' },
              { title: 'Process concept and process control block' },
            ],
          },
          {
            title: 'CPU Scheduling and Synchronisation',
            topics: [
              { title: 'Scheduling algorithms: FCFS, SJF, round robin' },
              { title: 'Critical section problem and semaphores' },
              { title: 'Deadlock detection, prevention and avoidance' },
            ],
          },
          {
            title: 'Memory Management',
            topics: [
              { title: 'Contiguous allocation and fragmentation' },
              { title: 'Paging and segmentation' },
              { title: 'Virtual memory and page replacement algorithms', difficulty: 'hard' },
            ],
          },
        ],
      },
      {
        name: 'Web Technologies',
        code: 'BCA205',
        type: 'both',
        credits: 3,
        color: '#22c55e',
        icon: 'globe',
        units: [
          {
            title: 'HTML and CSS',
            topics: [
              { title: 'HTML5 document structure and semantic elements' },
              { title: 'Forms, tables and multimedia' },
              { title: 'CSS selectors, box model and flexbox' },
            ],
          },
          {
            title: 'JavaScript Essentials',
            topics: [
              { title: 'Variables, functions and scope' },
              { title: 'DOM manipulation and events' },
              { title: 'Fetch API and asynchronous JavaScript' },
            ],
          },
          {
            title: 'Web Hosting and Standards',
            topics: [
              { title: 'Client-server architecture and HTTP' },
              { title: 'Responsive design and accessibility' },
              { title: 'Domain, hosting and deployment basics' },
            ],
          },
        ],
      },
    ],
  },
  {
    semester: 3,
    subjects: [
      {
        name: 'Java Programming',
        code: 'BCA301',
        type: 'both',
        credits: 4,
        color: '#e11d48',
        icon: 'coffee',
        units: [
          {
            title: 'Java Fundamentals',
            topics: [
              { title: 'JVM, JDK, JRE and bytecode' },
              { title: 'Data types, operators and control statements' },
              { title: 'Arrays and command line arguments' },
            ],
          },
          {
            title: 'Object Oriented Java',
            topics: [
              { title: 'Classes, objects and constructors' },
              { title: 'Inheritance, interfaces and packages' },
              { title: 'Exception handling and multithreading', difficulty: 'hard' },
            ],
          },
          {
            title: 'Collections and I/O',
            topics: [
              { title: 'Collection framework: List, Set, Map' },
              { title: 'File and stream based I/O' },
              { title: 'JDBC and database connectivity' },
            ],
          },
        ],
      },
      {
        name: 'Database Management Systems',
        code: 'BCA302',
        type: 'both',
        credits: 4,
        color: '#0891b2',
        icon: 'database',
        units: [
          {
            title: 'Database Concepts and Modelling',
            topics: [
              { title: 'DBMS architecture and data independence' },
              { title: 'ER modelling and normalisation' },
              { title: 'Relational algebra and calculus' },
            ],
          },
          {
            title: 'SQL and Query Processing',
            topics: [
              { title: 'DDL, DML and DCL statements' },
              { title: 'Joins, subqueries and views' },
              { title: 'Triggers, procedures and indexing' },
            ],
          },
          {
            title: 'Transactions and Recovery',
            topics: [
              { title: 'ACID properties and concurrency control' },
              { title: 'Locking protocols and deadlocks' },
              { title: 'Log based recovery and backups' },
            ],
          },
        ],
      },
      {
        name: 'Computer Networks',
        code: 'BCA303',
        type: 'theory',
        credits: 3,
        color: '#7c3aed',
        icon: 'network',
        units: [
          {
            title: 'Network Fundamentals',
            topics: [
              { title: 'OSI and TCP/IP reference models' },
              { title: 'Transmission media and topologies' },
              { title: 'Error detection and correction' },
            ],
          },
          {
            title: 'Data Link and Network Layers',
            topics: [
              { title: 'Framing, flow and error control' },
              { title: 'IPv4/IPv6 addressing and subnetting' },
              { title: 'Routing algorithms and protocols' },
            ],
          },
          {
            title: 'Transport and Application Layers',
            topics: [
              { title: 'TCP, UDP and congestion control' },
              { title: 'DNS, HTTP, SMTP and FTP' },
              { title: 'Network security and firewalls' },
            ],
          },
        ],
      },
      {
        name: 'Statistics for Data Analysis',
        code: 'BCA304',
        type: 'theory',
        credits: 3,
        color: '#db2777',
        icon: 'bar-chart',
        units: [
          {
            title: 'Descriptive Statistics',
            topics: [
              { title: 'Measures of central tendency and dispersion' },
              { title: 'Skewness, kurtosis and box plots' },
              { title: 'Correlation and regression' },
            ],
          },
          {
            title: 'Probability',
            topics: [
              { title: 'Axioms, conditional probability and Bayes theorem' },
              { title: 'Random variables and distributions' },
              { title: 'Binomial, Poisson and normal distributions' },
            ],
          },
          {
            title: 'Inferential Statistics',
            topics: [
              { title: 'Sampling and estimation' },
              { title: 'Hypothesis testing and p-values' },
              { title: 'Chi-square and ANOVA' },
            ],
          },
        ],
      },
      {
        name: 'Software Engineering',
        code: 'BCA305',
        type: 'theory',
        credits: 3,
        color: '#65a30d',
        icon: 'workflow',
        units: [
          {
            title: 'Software Process Models',
            topics: [
              { title: 'Waterfall, incremental and spiral models' },
              { title: 'Agile and Scrum' },
              { title: 'Requirement engineering' },
            ],
          },
          {
            title: 'Design and Testing',
            topics: [
              { title: 'Architectural and detailed design' },
              { title: 'Unit, integration and system testing' },
              { title: 'Software metrics and quality assurance' },
            ],
          },
          {
            title: 'Project Management',
            topics: [
              { title: 'Effort estimation and COCOMO' },
              { title: 'Risk management' },
              { title: 'Version control and DevOps basics' },
            ],
          },
        ],
      },
    ],
  },
  {
    semester: 4,
    subjects: [
      {
        name: 'Python Programming',
        code: 'BCA401',
        type: 'both',
        credits: 4,
        color: '#facc15',
        icon: 'terminal',
        units: [
          {
            title: 'Python Basics',
            topics: [
              { title: 'Syntax, variables and data types' },
              { title: 'Control flow and functions' },
              { title: 'Strings, lists, tuples and dictionaries' },
            ],
          },
          {
            title: 'Advanced Python',
            topics: [
              { title: 'Modules, packages and virtual environments' },
              { title: 'File handling and exception handling' },
              { title: 'Object oriented programming in Python' },
            ],
          },
          {
            title: 'Python for Data and Web',
            topics: [
              { title: 'NumPy and Pandas fundamentals' },
              { title: 'Matplotlib visualisation' },
              { title: 'Introduction to Flask and REST APIs' },
            ],
          },
        ],
      },
      {
        name: 'Advanced Database Systems',
        code: 'BCA402',
        type: 'both',
        credits: 4,
        color: '#0284c7',
        icon: 'database',
        units: [
          {
            title: 'Advanced SQL and PL/SQL',
            topics: [
              { title: 'Stored procedures and functions' },
              { title: 'Cursors and exception handling in PL/SQL' },
              { title: 'Query optimisation and execution plans' },
            ],
          },
          {
            title: 'Distributed and NoSQL Databases',
            topics: [
              { title: 'Distributed database architecture' },
              { title: 'CAP theorem and consistency models' },
              { title: 'Document and key-value stores' },
            ],
          },
          {
            title: 'Data Warehousing',
            topics: [
              { title: 'OLTP vs OLAP and star schemas' },
              { title: 'ETL pipelines' },
              { title: 'Introduction to data mining' },
            ],
          },
        ],
      },
      {
        name: 'Algorithms and Complexity',
        code: 'BCA403',
        type: 'theory',
        credits: 4,
        color: '#7e22ce',
        icon: 'binary',
        units: [
          {
            title: 'Algorithm Analysis',
            topics: [
              { title: 'Asymptotic notation and complexity classes' },
              { title: 'Recurrence solving and master theorem' },
              { title: 'Amortised analysis' },
            ],
          },
          {
            title: 'Algorithm Design Techniques',
            topics: [
              { title: 'Divide and conquer' },
              { title: 'Greedy algorithms' },
              { title: 'Dynamic programming', difficulty: 'hard' },
            ],
          },
          {
            title: 'Advanced Topics',
            topics: [
              { title: 'Backtracking and branch and bound' },
              { title: 'NP-completeness and reductions' },
              { title: 'Approximation algorithms' },
            ],
          },
        ],
      },
      {
        name: 'System Analysis and Design',
        code: 'BCA404',
        type: 'theory',
        credits: 3,
        color: '#475569',
        icon: 'layout-dashboard',
        units: [
          {
            title: 'Systems Development Life Cycle',
            topics: [
              { title: 'Phases of SDLC and deliverables' },
              { title: 'Feasibility study and cost benefit analysis' },
              { title: 'Fact finding techniques' },
            ],
          },
          {
            title: 'Structured Analysis Tools',
            topics: [
              { title: 'Data flow diagrams' },
              { title: 'Data dictionary and decision tables' },
              { title: 'Entity relationship modelling' },
            ],
          },
          {
            title: 'Implementation and Maintenance',
            topics: [
              { title: 'Input/output design and forms' },
              { title: 'Conversion strategies' },
              { title: 'Post implementation review' },
            ],
          },
        ],
      },
      {
        name: 'Environmental Studies',
        code: 'BCA405',
        type: 'theory',
        credits: 2,
        color: '#16a34a',
        icon: 'leaf',
        units: [
          {
            title: 'Ecosystems and Natural Resources',
            topics: [
              { title: 'Ecosystem structure and function' },
              { title: 'Forest, water and energy resources' },
              { title: 'Biodiversity and conservation' },
            ],
          },
          {
            title: 'Environmental Pollution',
            topics: [
              { title: 'Air, water and soil pollution' },
              { title: 'Solid waste and e-waste management' },
              { title: 'Climate change and global warming' },
            ],
          },
          {
            title: 'Sustainability and Society',
            topics: [
              { title: 'Sustainable development goals' },
              { title: 'Environmental legislation in India' },
              { title: 'Green computing practices' },
            ],
          },
        ],
      },
    ],
  },
  {
    semester: 5,
    subjects: [
      {
        name: 'Web Development with React',
        code: 'BCA501',
        type: 'both',
        credits: 4,
        color: '#06b6d4',
        icon: 'atom',
        units: [
          {
            title: 'Modern JavaScript and Tooling',
            topics: [
              { title: 'ES6+ features and modules' },
              { title: 'npm, bundlers and build tools' },
              { title: 'Promises, async/await and fetch' },
            ],
          },
          {
            title: 'React Fundamentals',
            topics: [
              { title: 'Components, props and state' },
              { title: 'Hooks: useState, useEffect, useMemo' },
              { title: 'Routing and forms in React' },
            ],
          },
          {
            title: 'State Management and APIs',
            topics: [
              { title: 'Context API and global state' },
              { title: 'Consuming REST APIs and error handling' },
              { title: 'Testing and deploying React applications' },
            ],
          },
        ],
      },
      {
        name: 'Mobile Application Development',
        code: 'BCA502',
        type: 'both',
        credits: 4,
        color: '#f43f5e',
        icon: 'smartphone',
        units: [
          {
            title: 'Mobile Platforms',
            topics: [
              { title: 'Native vs hybrid vs cross platform' },
              { title: 'Android architecture and activities' },
              { title: 'Mobile UI design principles' },
            ],
          },
          {
            title: 'App Development',
            topics: [
              { title: 'Layouts, widgets and navigation' },
              { title: 'Data storage: preferences, SQLite, files' },
              { title: 'Networking and REST integration' },
            ],
          },
          {
            title: 'Publishing',
            topics: [
              { title: 'Permissions and security model' },
              { title: 'Testing and debugging tools' },
              { title: 'App store submission process' },
            ],
          },
        ],
      },
      {
        name: 'Computer Graphics',
        code: 'BCA503',
        type: 'theory',
        credits: 3,
        color: '#a855f7',
        icon: 'shapes',
        units: [
          {
            title: 'Graphics Primitives',
            topics: [
              { title: 'Raster and vector graphics' },
              { title: 'Line and circle drawing algorithms' },
              { title: 'Polygon filling algorithms' },
            ],
          },
          {
            title: '2D and 3D Transformations',
            topics: [
              { title: 'Translation, rotation, scaling and shearing' },
              { title: 'Homogeneous coordinates' },
              { title: 'Projection: parallel and perspective' },
            ],
          },
          {
            title: 'Rendering and Animation',
            topics: [
              { title: 'Clipping algorithms' },
              { title: 'Hidden surface removal and shading' },
              { title: 'Animation techniques and keyframing' },
            ],
          },
        ],
      },
      {
        name: 'Cyber Security Fundamentals',
        code: 'BCA504',
        type: 'theory',
        credits: 3,
        color: '#1e293b',
        icon: 'shield',
        units: [
          {
            title: 'Security Foundations',
            topics: [
              { title: 'CIA triad and threat landscape' },
              { title: 'Authentication and authorisation models' },
              { title: 'Cryptography: symmetric and asymmetric' },
            ],
          },
          {
            title: 'Application and Network Security',
            topics: [
              { title: 'OWASP Top 10 web vulnerabilities' },
              { title: 'Firewalls, IDS and VPNs' },
              { title: 'Secure coding practices' },
            ],
          },
          {
            title: 'Ethical Hacking and Forensics',
            topics: [
              { title: 'Reconnaissance and scanning' },
              { title: 'Penetration testing methodology' },
              { title: 'Digital forensics and incident response' },
            ],
          },
        ],
      },
      {
        name: 'Cloud Computing',
        code: 'BCA505',
        type: 'theory',
        credits: 3,
        color: '#38bdf8',
        icon: 'cloud',
        units: [
          {
            title: 'Cloud Fundamentals',
            topics: [
              { title: 'IaaS, PaaS and SaaS' },
              { title: 'Public, private and hybrid clouds' },
              { title: 'Virtualisation and containers' },
            ],
          },
          {
            title: 'Cloud Services',
            topics: [
              { title: 'Compute, storage and networking services' },
              { title: 'Managed databases and messaging' },
              { title: 'Serverless computing' },
            ],
          },
          {
            title: 'Cloud Operations',
            topics: [
              { title: 'Identity and access management' },
              { title: 'Cost optimisation and monitoring' },
              { title: 'DevOps and CI/CD pipelines' },
            ],
          },
        ],
      },
    ],
  },
  {
    semester: 6,
    subjects: [
      {
        name: 'Artificial Intelligence & Machine Learning',
        code: 'BCA601',
        type: 'both',
        credits: 4,
        color: '#8b5cf6',
        icon: 'brain',
        units: [
          {
            title: 'AI Foundations',
            topics: [
              { title: 'Intelligent agents and environments' },
              { title: 'Search strategies: BFS, DFS, A*' },
              { title: 'Knowledge representation and inference' },
            ],
          },
          {
            title: 'Machine Learning',
            topics: [
              { title: 'Supervised vs unsupervised learning' },
              { title: 'Regression and classification algorithms' },
              { title: 'Model evaluation and overfitting' },
            ],
          },
          {
            title: 'Neural Networks and Applications',
            topics: [
              { title: 'Perceptrons and backpropagation' },
              { title: 'Introduction to deep learning and CNNs' },
              { title: 'Natural language processing basics' },
            ],
          },
        ],
      },
      {
        name: 'Software Project Management',
        code: 'BCA602',
        type: 'theory',
        credits: 3,
        color: '#d97706',
        icon: 'clipboard-list',
        units: [
          {
            title: 'Project Planning',
            topics: [
              { title: 'Project charter and scope management' },
              { title: 'Work breakdown structure and scheduling' },
              { title: 'Estimation techniques' },
            ],
          },
          {
            title: 'Execution and Control',
            topics: [
              { title: 'Team organisation and communication' },
              { title: 'Risk and change management' },
              { title: 'Progress tracking with Gantt and PERT' },
            ],
          },
          {
            title: 'Quality and Closure',
            topics: [
              { title: 'Quality planning and assurance' },
              { title: 'Configuration management' },
              { title: 'Project closure and documentation' },
            ],
          },
        ],
      },
      {
        name: 'Internet of Things',
        code: 'BCA603',
        type: 'theory',
        credits: 3,
        color: '#059669',
        icon: 'radio',
        units: [
          {
            title: 'IoT Architecture',
            topics: [
              { title: 'Sensors, actuators and embedded boards' },
              { title: 'IoT reference architecture and protocols' },
              { title: 'Edge and fog computing' },
            ],
          },
          {
            title: 'Connectivity and Data',
            topics: [
              { title: 'MQTT, CoAP and HTTP' },
              { title: 'IoT data storage and analytics' },
              { title: 'Power and resource constraints' },
            ],
          },
          {
            title: 'IoT Applications and Security',
            topics: [
              { title: 'Smart home, health and agriculture use cases' },
              { title: 'IoT security threats and defences' },
              { title: 'Privacy and regulation' },
            ],
          },
        ],
      },
      {
        name: 'Data Analytics with Python',
        code: 'BCA604',
        type: 'both',
        credits: 4,
        color: '#0d9488',
        icon: 'line-chart',
        units: [
          {
            title: 'Data Preparation',
            topics: [
              { title: 'Data cleaning and missing values' },
              { title: 'Feature engineering' },
              { title: 'Exploratory data analysis' },
            ],
          },
          {
            title: 'Analysis and Visualisation',
            topics: [
              { title: 'Grouping, pivoting and aggregation' },
              { title: 'Interactive visualisation with Plotly' },
              { title: 'Dashboarding fundamentals' },
            ],
          },
          {
            title: 'Applied Analytics',
            topics: [
              { title: 'Time series analysis' },
              { title: 'Recommendation systems' },
              { title: 'End to end analytics project' },
            ],
          },
        ],
      },
      {
        name: 'Major Project',
        code: 'BCA605',
        type: 'practical',
        credits: 6,
        color: '#334155',
        icon: 'rocket',
        units: [
          {
            title: 'Project Definition',
            topics: [
              { title: 'Problem identification and literature survey' },
              { title: 'Requirement specification and SRS' },
              { title: 'Technology selection and architecture' },
            ],
          },
          {
            title: 'Implementation',
            topics: [
              { title: 'Modular development and version control' },
              { title: 'Testing strategy and bug tracking' },
              { title: 'Documentation and user manual' },
            ],
          },
          {
            title: 'Evaluation',
            topics: [
              { title: 'Result analysis and benchmarking' },
              { title: 'Presentation and viva preparation' },
              { title: 'Future enhancements' },
            ],
          },
        ],
      },
    ],
  },
];

const CODING_EXERCISES = [
  {
    title: 'Print Hello BCA',
    slug: 'print-hello-bca',
    description: 'Print a greeting to standard output.',
    problemStatement:
      'Write a program that prints exactly:\n\nHello, BCA!\n\nUse standard output only. Do not print anything else.',
    subjectCode: 'BCA102',
    difficulty: 'easy',
    languages: ['c', 'java', 'python'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main(void) {\n    // TODO: print the greeting\n    return 0;\n}\n',
      java: 'public class Main {\n    public static void main(String[] args) {\n        // TODO: print the greeting\n    }\n}\n',
      python: '# TODO: print the greeting\n',
    },
    sampleTestCases: [{ input: '', expectedOutput: 'Hello, BCA!', explanation: 'Exact match required.' }],
    hiddenTestCases: [{ input: '', expectedOutput: 'Hello, BCA!', isHidden: true }],
    hints: ['printf puts text on the console in C.', 'System.out.println() is the Java equivalent.'],
    explanation: 'A minimal program that prints a fixed string exercises the compiler and the judge pipeline.',
    points: 10,
    tags: ['basics', 'output'],
  },
  {
    title: 'Sum of Two Integers',
    slug: 'sum-of-two-integers',
    description: 'Read two integers and print their sum.',
    problemStatement:
      'Read two integers a and b separated by a space, then print a single line containing a + b.',
    subjectCode: 'BCA102',
    difficulty: 'easy',
    languages: ['c', 'java', 'python'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main(void) {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    // TODO: print the sum\n    return 0;\n}\n',
      java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int a = sc.nextInt();\n        int b = sc.nextInt();\n        // TODO: print the sum\n    }\n}\n',
      python: 'a, b = map(int, input().split())\n# TODO: print the sum\n',
    },
    sampleTestCases: [
      { input: '2 3', expectedOutput: '5', explanation: 'Basic addition.' },
      { input: '-4 10', expectedOutput: '6', explanation: 'Negative operands are allowed.' },
    ],
    hiddenTestCases: [
      { input: '1000000 2000000', expectedOutput: '3000000', isHidden: true },
      { input: '0 0', expectedOutput: '0', isHidden: true },
    ],
    hints: ['Read input before computing.', 'Handle negative numbers - no special casing needed.'],
    explanation: 'Tests input parsing and integer arithmetic.',
    points: 15,
    tags: ['arithmetic', 'io'],
  },
  {
    title: 'Even or Odd',
    slug: 'even-or-odd',
    description: 'Classify a number using the modulus operator.',
    problemStatement: 'Read an integer n and print "Even" if it is divisible by 2, otherwise print "Odd".',
    subjectCode: 'BCA102',
    difficulty: 'easy',
    languages: ['c', 'java', 'python'],
    starterCode: {
      c: '#include <stdio.h>\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    // TODO: decide and print\n    return 0;\n}\n',
      java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        // TODO: decide and print\n    }\n}\n',
      python: 'n = int(input())\n# TODO: decide and print\n',
    },
    sampleTestCases: [
      { input: '7', expectedOutput: 'Odd', explanation: '7 % 2 == 1' },
      { input: '10', expectedOutput: 'Even', explanation: '10 % 2 == 0' },
    ],
    hiddenTestCases: [{ input: '0', expectedOutput: 'Even', isHidden: true }],
    hints: ['Use the % operator.', 'Zero is even.'],
    explanation: 'Introduces branching and the modulus operator.',
    points: 10,
    tags: ['conditionals'],
  },
  {
    title: 'Reverse a String',
    slug: 'reverse-a-string',
    description: 'Print the reverse of the given string.',
    problemStatement: 'Read a single line of text and print it reversed. Preserve spaces and punctuation.',
    subjectCode: 'BCA401',
    difficulty: 'medium',
    languages: ['c', 'java', 'python'],
    starterCode: {
      c: '#include <stdio.h>\n#include <string.h>\n\nint main(void) {\n    char text[1000];\n    if (!fgets(text, sizeof(text), stdin)) return 0;\n    // TODO: strip the newline and print the reverse\n    return 0;\n}\n',
      java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String text = sc.hasNextLine() ? sc.nextLine() : "";\n        // TODO: print the reverse\n    }\n}\n',
      python: 'text = input()\n# TODO: print the reverse\n',
    },
    sampleTestCases: [
      { input: 'hello', expectedOutput: 'olleh', explanation: 'Simple word.' },
      { input: 'BCA SmartLearn', expectedOutput: 'nraeLtramS ACB', explanation: 'Spaces are characters too.' },
    ],
    hiddenTestCases: [
      { input: 'a', expectedOutput: 'a', isHidden: true },
      { input: 'madam', expectedOutput: 'madam', isHidden: true },
    ],
    hints: ['Traverse from the last index to the first.', 'In C, remember to drop the trailing newline from fgets.'],
    explanation: 'Practises strings, indices and careful newline handling.',
    points: 20,
    tags: ['strings', 'loops'],
  },
  {
    title: 'Factorial with Recursion',
    slug: 'factorial-with-recursion',
    description: 'Compute n! using a recursive function.',
    problemStatement:
      'Read a non-negative integer n (0 <= n <= 12) and print n! (the factorial of n).\n\nBy definition 0! = 1.',
    subjectCode: 'BCA102',
    difficulty: 'medium',
    languages: ['c', 'java', 'python'],
    starterCode: {
      c: '#include <stdio.h>\n\nlong long factorial(int n) {\n    // TODO: implement recursively\n    return 1;\n}\n\nint main(void) {\n    int n;\n    scanf("%d", &n);\n    printf("%lld\\n", factorial(n));\n    return 0;\n}\n',
      java: 'import java.util.Scanner;\n\npublic class Main {\n    static long factorial(int n) {\n        // TODO: implement recursively\n        return 1;\n    }\n\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println(factorial(sc.nextInt()));\n    }\n}\n',
      python: 'def factorial(n):\n    # TODO: implement recursively\n    return 1\n\n\nprint(factorial(int(input())))\n',
    },
    sampleTestCases: [
      { input: '5', expectedOutput: '120', explanation: '5! = 120' },
      { input: '0', expectedOutput: '1', explanation: 'Base case.' },
    ],
    hiddenTestCases: [{ input: '12', expectedOutput: '479001600', isHidden: true }],
    hints: ['Define the base case first.', 'n! = n * (n - 1)!'],
    explanation: 'Tests recursion and base-case handling.',
    points: 20,
    tags: ['recursion', 'functions'],
  },
  {
    title: 'Count Vowels',
    slug: 'count-vowels',
    description: 'Count the vowels in a line of text.',
    problemStatement:
      'Read a line of text and print the number of vowels (a, e, i, o, u) in it. Treat upper and lower case the same.',
    subjectCode: 'BCA401',
    difficulty: 'easy',
    languages: ['c', 'java', 'python'],
    starterCode: {
      c: '#include <stdio.h>\n#include <ctype.h>\n\nint main(void) {\n    char text[1000];\n    if (!fgets(text, sizeof(text), stdin)) return 0;\n    // TODO: count the vowels\n    return 0;\n}\n',
      java: 'import java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        String text = sc.hasNextLine() ? sc.nextLine() : "";\n        // TODO: count the vowels\n    }\n}\n',
      python: 'text = input()\n# TODO: count the vowels\n',
    },
    sampleTestCases: [
      { input: 'Programming', expectedOutput: '3', explanation: 'o, a, i' },
      { input: 'BCA SMARTLEARN', expectedOutput: '3', explanation: 'Case insensitive.' },
    ],
    hiddenTestCases: [{ input: 'xyz', expectedOutput: '0', isHidden: true }],
    hints: ['Lower-case the string first.', 'Loop over characters and test membership.'],
    explanation: 'Combines string iteration with conditional counting.',
    points: 15,
    tags: ['strings', 'loops'],
  },
];

const NOTE_TEMPLATES = [
  {
    title: 'C Data Types - Quick Revision',
    format: 'quick_revision',
    subjectCode: 'BCA102',
    tags: ['c', 'basics', 'revision'],
    description: 'A one-page revision sheet covering the core C data types.',
    content: `# C Data Types - Quick Revision

## Primary Types
| Type | Typical size | Range |
| --- | --- | --- |
| \`char\` | 1 byte | -128 to 127 |
| \`int\` | 4 bytes | -2,147,483,648 to 2,147,483,647 |
| \`float\` | 4 bytes | ~6 decimal digits |
| \`double\` | 8 bytes | ~15 decimal digits |

## Key Points
- Use \`sizeof(type)\` to get the exact size on the current platform.
- Use \`unsigned\` when negative values are impossible.
- \`%d\` prints \`int\`, \`%f\` prints \`float\`/\`double\`, \`%c\` prints \`char\`, \`%s\` prints a string.

## Common Exam Traps
1. Integer division: \`5 / 2\` is **2**, not 2.5. Use \`5 / 2.0\` for a fractional result.
2. Overflow: assigning 300 to a \`char\` wraps around.
3. Uninitialised variables contain garbage values.`,
  },
  {
    title: 'Operators in C - Definitions & Terminology',
    format: 'definitions',
    subjectCode: 'BCA102',
    tags: ['c', 'operators'],
    description: 'Precise definitions of the operator categories used in exams.',
    content: `# Operators in C

**Operator** - A symbol that tells the compiler to perform a specific mathematical or logical operation on operands.

**Arithmetic operator** - Performs basic maths: \`+\`, \`-\`, \`*\`, \`/\`, \`%\`.

**Relational operator** - Compares two values and yields 1 (true) or 0 (false): \`<\`, \`>\`, \`<=\`, \`>=\`, \`==\`, \`!=\`.

**Logical operator** - Combines conditions: \`&&\` (AND), \`||\` (OR), \`!\` (NOT).

**Assignment operator** - Stores a value in a variable: \`=\`, and the compound forms \`+=\`, \`-=\`, \`*=\`, \`/=\`, \`%=\`.

**Increment / decrement** - \`++\` and \`--\`, available in prefix (\`++i\`) and postfix (\`i++\`) forms.

**Bitwise operator** - Operates on individual bits: \`&\`, \`|\`, \`^\`, \`~\`, \`<<\`, \`>>\`.

**Ternary operator** - The only operator with three operands: \`condition ? valueIfTrue : valueIfFalse\`.`,
  },
  {
    title: 'Number System Conversions - Worked Examples',
    format: 'programming_examples',
    subjectCode: 'BCA101',
    tags: ['number-systems', 'sem1'],
    description: 'Step-by-step worked conversions between number systems.',
    content: `# Number System Conversions

## Decimal to Binary (repeated division)
Convert 45 to binary:

| Division | Quotient | Remainder |
| --- | --- | --- |
| 45 / 2 | 22 | 1 |
| 22 / 2 | 11 | 0 |
| 11 / 2 | 5 | 1 |
| 5 / 2 | 2 | 1 |
| 2 / 2 | 1 | 0 |
| 1 / 2 | 0 | 1 |

Read the remainders bottom-up: **101101**

## Binary to Decimal (positional weights)
\`101101\` = 32 + 0 + 8 + 4 + 0 + 1 = **45**

## Binary to Hexadecimal (group by 4)
\`1011 0101\` -> \`B5\` in hexadecimal

## Exam Tip
Always state the method name (repeated division / positional weighting) in your answer - it usually carries marks.`,
  },
];

const QUESTIONS = [
  {
    subjectCode: 'BCA102',
    topicTitle: 'Operators and expressions',
    type: 'mcq',
    difficulty: 'easy',
    marks: 1,
    prompt: 'What is the output of the expression 7 / 2 in C when both operands are int?',
    options: [
      { key: 'A', text: '3.5' },
      { key: 'B', text: '3' },
      { key: 'C', text: '4' },
      { key: 'D', text: 'Compilation error' },
    ],
    correctOptionKeys: ['B'],
    explanation: 'Integer division truncates the fractional part, so 7 / 2 evaluates to 3.',
    tags: ['operators', 'integer-division'],
  },
  {
    subjectCode: 'BCA102',
    topicTitle: 'Data types, variables and constants',
    type: 'mcq',
    difficulty: 'easy',
    marks: 1,
    prompt: 'Which format specifier is used to print a long long integer in C?',
    options: [
      { key: 'A', text: '%d' },
      { key: 'B', text: '%ld' },
      { key: 'C', text: '%lld' },
      { key: 'D', text: '%llf' },
    ],
    correctOptionKeys: ['C'],
    explanation: '%lld is the correct specifier for long long int.',
    tags: ['io', 'format-specifiers'],
  },
  {
    subjectCode: 'BCA102',
    topicTitle: 'Pointer declaration, arithmetic and pointer to array',
    type: 'true_false',
    difficulty: 'medium',
    marks: 1,
    prompt: 'In C, adding 1 to an int pointer advances the address by sizeof(int) bytes.',
    options: [
      { key: 'true', text: 'True' },
      { key: 'false', text: 'False' },
    ],
    correctOptionKeys: ['true'],
    explanation: 'Pointer arithmetic scales by the size of the pointed-to type.',
    tags: ['pointers'],
  },
  {
    subjectCode: 'BCA102',
    topicTitle: 'Looping: while, do-while and for',
    type: 'output_prediction',
    difficulty: 'medium',
    marks: 2,
    prompt: 'How many times does the body of this loop execute?\n\nint i = 0;\nwhile (i < 5) {\n    i += 2;\n}',
    correctAnswerText: '3',
    acceptedAnswers: ['3', 'three', '3 times'],
    explanation: 'i takes the values 0, 2 and 4 before reaching 6, so the body runs three times.',
    tags: ['loops'],
  },
  {
    subjectCode: 'BCA102',
    topicTitle: 'Function definition, prototypes and parameter passing',
    type: 'multi_select',
    difficulty: 'medium',
    marks: 2,
    prompt: 'Which of the following statements about C function parameters are correct?',
    options: [
      { key: 'A', text: 'C passes all arguments by value by default.' },
      { key: 'B', text: 'Pass-by-reference can be simulated using pointers.' },
      { key: 'C', text: 'A function may return multiple values directly.' },
      { key: 'D', text: 'Arrays decay to pointers when passed to functions.' },
    ],
    correctOptionKeys: ['A', 'B', 'D'],
    explanation:
      'C is strictly pass-by-value; pointers emulate references. Functions return a single value, but arrays decay to pointers.',
    tags: ['functions', 'pointers'],
  },
  {
    subjectCode: 'BCA101',
    topicTitle: 'Binary, octal, decimal and hexadecimal number systems',
    type: 'mcq',
    difficulty: 'easy',
    marks: 1,
    prompt: 'What is the decimal value of the binary number 1011?',
    options: [
      { key: 'A', text: '9' },
      { key: 'B', text: '11' },
      { key: 'C', text: '13' },
      { key: 'D', text: '15' },
    ],
    correctOptionKeys: ['B'],
    explanation: '1011 = 8 + 0 + 2 + 1 = 11.',
    tags: ['number-systems'],
  },
  {
    subjectCode: 'BCA101',
    topicTitle: 'Character representation: ASCII, EBCDIC, Unicode',
    type: 'fill_blank',
    difficulty: 'easy',
    marks: 1,
    prompt: 'The ASCII code of the capital letter A is ______ in decimal.',
    correctAnswerText: '65',
    acceptedAnswers: ['65', 'sixty five'],
    explanation: 'Capital A is 65 in the ASCII table.',
    tags: ['ascii'],
  },
  {
    subjectCode: 'BCA101',
    topicTitle: 'Algorithm definition, characteristics and examples',
    type: 'mcq',
    difficulty: 'medium',
    marks: 1,
    prompt: 'Which of the following is NOT a required characteristic of an algorithm?',
    options: [
      { key: 'A', text: 'Finiteness' },
      { key: 'B', text: 'Definiteness' },
      { key: 'C', text: 'Ambiguity' },
      { key: 'D', text: 'Effectiveness' },
    ],
    correctOptionKeys: ['C'],
    explanation: 'An algorithm must be unambiguous, so ambiguity is not a characteristic.',
    tags: ['algorithms'],
  },
  {
    subjectCode: 'BCA201',
    topicTitle: 'Stack and its applications',
    type: 'mcq',
    difficulty: 'medium',
    marks: 1,
    prompt: 'Which data structure is used by the function call mechanism to store return addresses?',
    options: [
      { key: 'A', text: 'Queue' },
      { key: 'B', text: 'Stack' },
      { key: 'C', text: 'Linked list' },
      { key: 'D', text: 'Binary tree' },
    ],
    correctOptionKeys: ['B'],
    explanation: 'Calls are nested, so a last-in-first-out stack is the natural fit.',
    tags: ['stack'],
  },
  {
    subjectCode: 'BCA201',
    topicTitle: 'Merge sort and quick sort',
    type: 'mcq',
    difficulty: 'hard',
    marks: 2,
    prompt: 'What is the average-case time complexity of quick sort?',
    options: [
      { key: 'A', text: 'O(n)' },
      { key: 'B', text: 'O(n log n)' },
      { key: 'C', text: 'O(n^2)' },
      { key: 'D', text: 'O(log n)' },
    ],
    correctOptionKeys: ['B'],
    explanation: 'A balanced partition tree gives O(n log n) on average; the worst case is O(n^2).',
    tags: ['sorting', 'complexity'],
  },
  {
    subjectCode: 'BCA204',
    topicTitle: 'Scheduling algorithms: FCFS, SJF, round robin',
    type: 'mcq',
    difficulty: 'medium',
    marks: 1,
    prompt: 'Which CPU scheduling algorithm can cause starvation of long jobs?',
    options: [
      { key: 'A', text: 'First Come First Served' },
      { key: 'B', text: 'Shortest Job First' },
      { key: 'C', text: 'Round Robin' },
      { key: 'D', text: 'FIFO with ageing' },
    ],
    correctOptionKeys: ['B'],
    explanation: 'Shortest Job First keeps preferring short bursts, starving long ones without ageing.',
    tags: ['scheduling'],
  },
  {
    subjectCode: 'BCA302',
    topicTitle: 'DDL, DML and DCL statements',
    type: 'multi_select',
    difficulty: 'easy',
    marks: 2,
    prompt: 'Which of the following are DDL statements in SQL?',
    options: [
      { key: 'A', text: 'CREATE' },
      { key: 'B', text: 'INSERT' },
      { key: 'C', text: 'ALTER' },
      { key: 'D', text: 'DROP' },
    ],
    correctOptionKeys: ['A', 'C', 'D'],
    explanation: 'CREATE, ALTER and DROP change schema objects. INSERT is a DML statement.',
    tags: ['sql', 'ddl'],
  },
];

/* ---------------------------------------------------------------- helpers --- */

async function upsert(Model, filter, update) {
  return Model.findOneAndUpdate(filter, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true });
}

async function seedAcademic() {
  const university = await upsert(
    University,
    { code: 'SUT' },
    {
      name: 'State University of Technology',
      shortName: 'SUT',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      website: 'https://example.edu',
      description: 'Sample university used for development data.',
      isActive: true,
    }
  );

  const college = await upsert(
    College,
    { code: 'CICA' },
    {
      name: 'City Institute of Computer Applications',
      university: university._id,
      city: 'Pune',
      state: 'Maharashtra',
      isActive: true,
    }
  );

  const program = await upsert(
    AcademicProgram,
    { university: university._id, code: 'BCA' },
    {
      name: 'Bachelor of Computer Applications',
      code: 'BCA',
      degree: 'BCA',
      university: university._id,
      durationSemesters: 6,
      description: 'Six semester undergraduate programme in computer applications.',
      isActive: true,
    }
  );

  const gradingScheme = await upsert(
    GradingScheme,
    { code: 'BCA-10PT' },
    {
      name: 'BCA 10-Point Grading Scheme',
      code: 'BCA-10PT',
      university: university._id,
      maxMarks: 100,
      passMark: 40,
      internalWeight: 30,
      externalWeight: 70,
      gradeBands: GRADE_BANDS,
      description: 'Standard 10-point letter grading with a 40% pass mark.',
      isDefault: true,
      isActive: true,
    }
  );

  const regulation = await upsert(
    AcademicRegulation,
    { program: program._id, code: 'BCA-2024', year: 2024 },
    {
      name: 'BCA Regulation 2024',
      code: 'BCA-2024',
      program: program._id,
      university: university._id,
      year: 2024,
      effectiveFrom: new Date('2024-07-01'),
      totalSemesters: 6,
      gradingScheme: gradingScheme._id,
      description: 'Outcome based curriculum effective from the 2024-25 academic year.',
      isActive: true,
    }
  );

  const semesterDocs = new Map();
  for (let number = 1; number <= 6; number += 1) {
    const semester = await upsert(
      Semester,
      { regulation: regulation._id, number },
      {
        title: `Semester ${number}`,
        description: `Semester ${number} of the BCA programme.`,
        order: number,
        isActive: true,
      }
    );
    semesterDocs.set(number, semester);
  }

  let subjectCount = 0;
  let unitCount = 0;
  let topicCount = 0;
  const subjectsByCode = new Map();
  const topicsByTitle = new Map();

  for (const block of SYLLABUS) {
    const semester = semesterDocs.get(block.semester);

    for (const subjectPayload of block.subjects) {
      const subject = await upsert(
        Subject,
        { code: subjectPayload.code },
        {
          name: subjectPayload.name,
          shortName: subjectPayload.name.split(' ').slice(0, 2).join(' '),
          description: `${subjectPayload.name} - Semester ${block.semester} of the BCA programme.`,
          regulation: regulation._id,
          semester: semester._id,
          semesterNumber: block.semester,
          university: university._id,
          credits: subjectPayload.credits,
          type: subjectPayload.type,
          recommendedStudyHours: subjectPayload.credits * 12,
          color: subjectPayload.color,
          icon: subjectPayload.icon,
          markingScheme: {
            theory: subjectPayload.type === 'practical' ? 0 : 70,
            internal: subjectPayload.type === 'practical' ? 0 : 30,
            practical: subjectPayload.type === 'practical' ? 100 : 0,
            total: 100,
          },
          owner: null,
          isTemplate: true,
          isPublished: true,
          isActive: true,
          tags: [`semester-${block.semester}`, subjectPayload.type],
        }
      );

      subjectsByCode.set(subjectPayload.code, subject);
      subjectCount += 1;

      let unitNumber = 1;
      for (const unitPayload of subjectPayload.units) {
        const unit = await upsert(
          Unit,
          { subject: subject._id, number: unitNumber },
          {
            title: unitPayload.title,
            description: `${unitPayload.title} - Unit ${unitNumber} of ${subjectPayload.name}.`,
            recommendedHours: Math.max(6, Math.round((subjectPayload.credits * 12) / subjectPayload.units.length)),
            weightage: Math.round(100 / subjectPayload.units.length),
            isActive: true,
          }
        );
        unitCount += 1;

        let topicNumber = 1;
        for (const topicPayload of unitPayload.topics) {
          const topic = await upsert(
            Topic,
            { subject: subject._id, unit: unit._id, title: topicPayload.title },
            {
              number: topicNumber,
              description: topicPayload.title,
              difficulty: topicPayload.difficulty || 'medium',
              recommendedMinutes: topicPayload.difficulty === 'hard' ? 90 : topicPayload.difficulty === 'easy' ? 30 : 45,
              keywords: topicPayload.title
                .toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .split(/\s+/)
                .filter((word) => word.length > 3)
                .slice(0, 6),
              isActive: true,
            }
          );
          topicsByTitle.set(`${subjectPayload.code}::${topicPayload.title}`, topic);
          topicCount += 1;
          topicNumber += 1;
        }
        unitNumber += 1;
      }
    }
  }

  return {
    university,
    college,
    program,
    regulation,
    gradingScheme,
    semesterDocs,
    subjectsByCode,
    topicsByTitle,
    counts: { subjects: subjectCount, units: unitCount, topics: topicCount },
  };
}

async function seedExercises(academic, admin) {
  let count = 0;
  for (const exercise of CODING_EXERCISES) {
    const subject = academic.subjectsByCode.get(exercise.subjectCode) || null;
    await upsert(
      CodingExercise,
      { slug: exercise.slug },
      {
        title: exercise.title,
        description: exercise.description,
        problemStatement: exercise.problemStatement,
        subject: subject?._id || null,
        unit: null,
        topic: null,
        languageRestrictions: exercise.languages,
        difficulty: exercise.difficulty,
        starterCode: exercise.starterCode,
        sampleTestCases: exercise.sampleTestCases,
        hiddenTestCases: exercise.hiddenTestCases,
        hints: exercise.hints,
        explanation: exercise.explanation,
        points: exercise.points,
        timeLimitSeconds: 5,
        memoryLimitKb: 256000,
        tags: exercise.tags,
        isPublished: true,
        createdBy: admin._id,
      }
    );
    count += 1;
  }
  return count;
}

async function seedQuestions(academic, admin) {
  let count = 0;
  for (const question of QUESTIONS) {
    const subject = academic.subjectsByCode.get(question.subjectCode) || null;
    const topic = academic.topicsByTitle.get(`${question.subjectCode}::${question.topicTitle}`) || null;

    await upsert(
      Question,
      { subject: subject?._id || null, prompt: question.prompt },
      {
        unit: topic?.unit || null,
        topic: topic?._id || null,
        type: question.type,
        difficulty: question.difficulty,
        marks: question.marks,
        negativeMarks: 0,
        codeSnippet: question.codeSnippet || '',
        language: '',
        options: question.options || [],
        correctOptionKeys: question.correctOptionKeys || [],
        correctAnswerText: question.correctAnswerText || '',
        acceptedAnswers: question.acceptedAnswers || [],
        explanation: question.explanation,
        source: 'admin',
        isApproved: true,
        isActive: true,
        tags: question.tags || [],
        createdBy: admin._id,
      }
    );
    count += 1;
  }
  return count;
}

async function seedNoteTemplates(academic, admin) {
  let count = 0;
  for (const template of NOTE_TEMPLATES) {
    const subject = academic.subjectsByCode.get(template.subjectCode) || null;
    await upsert(
      NoteTemplate,
      { title: template.title, subject: subject?._id || null },
      {
        description: template.description,
        unit: null,
        topic: null,
        format: template.format,
        content: template.content,
        tags: template.tags,
        isApproved: true,
        isPublished: true,
        createdBy: admin._id,
      }
    );
    count += 1;
  }
  return count;
}

async function seedDemoStudent(academic) {
  const email = 'student@demo.local';
  let student = await User.findOne({ email });

  if (!student) {
    student = new User({
      name: 'Demo Student',
      email,
      role: ROLES.STUDENT,
      status: ACCOUNT_STATUS.ACTIVE,
      emailVerified: true,
    });
    await student.setPassword('StudentDemo123');
    await student.save();
  } else {
    student.status = ACCOUNT_STATUS.ACTIVE;
    student.emailVerified = true;
    await student.save();
  }

  await upsert(
    StudentProfile,
    { user: student._id },
    {
      university: academic.university._id,
      college: academic.college._id,
      program: academic.program._id,
      regulation: academic.regulation._id,
      currentSemesterNumber: 1,
      academicYear: '2024-2025',
      examSystem: 'semester',
      gradingScheme: academic.gradingScheme._id,
      institutionName: academic.college.name,
      onboardingCompleted: true,
      onboardingStep: 4,
      studyPreferences: {
        knowledgeLevel: 'beginner',
        dailyStudyMinutes: 120,
        preferredFormats: ['quick_revision', 'detailed_conceptual', 'practice_questions'],
        preferredStudyDays: [1, 2, 3, 4, 5, 6],
        preferredStudyStartTime: '18:00',
        targetGrade: 'A',
        targetPercentage: 80,
        preferredLanguage: 'English',
      },
    }
  );

  const semesterOne = academic.semesterDocs.get(1);
  let enrollmentCount = 0;
  for (const subject of academic.subjectsByCode.values()) {
    const subjectSemester = academic.semesterDocs.get(subject.semesterNumber) || semesterOne;
    await upsert(
      StudentEnrollment,
      { student: student._id, subject: subject._id, academicYear: '2024-2025' },
      {
        semester: subjectSemester._id,
        regulation: academic.regulation._id,
        status: 'active',
        isCustom: false,
        credits: subject.credits,
        examDate: null,
        targetGrade: 'A',
      }
    );
    enrollmentCount += 1;
  }

  return { student, enrollmentCount };
}

/* ------------------------------------------------------------------- main --- */

async function main() {
  if (isProduction) {
    logger.error('Refusing to run the development seed in a production environment.');
    process.exitCode = 1;
    return;
  }

  await connectDatabase();
  logger.info('Seeding development data...');

  const academic = await seedAcademic();
  logger.info('Academic structure seeded', academic.counts);

  const admin =
    (await User.findOne({ role: ROLES.SUPER_ADMIN })) ||
    (await (async () => {
      const fallback = new User({
        name: env.SUPER_ADMIN_NAME || 'Platform Owner',
        email: env.SUPER_ADMIN_EMAIL || 'owner@bcasmartlearn.local',
        role: ROLES.SUPER_ADMIN,
        status: ACCOUNT_STATUS.ACTIVE,
        emailVerified: true,
      });
      await fallback.setPassword(env.SUPER_ADMIN_PASSWORD || 'ChangeThisOwner123');
      await fallback.save();
      logger.warn('No Super Admin found - created a placeholder owner account. Run `npm run create-admin` to set a real password.');
      return fallback;
    })());

  const [exerciseCount, questionCount, templateCount] = await Promise.all([
    seedExercises(academic, admin),
    seedQuestions(academic, admin),
    seedNoteTemplates(academic, admin),
  ]);

  const { student, enrollmentCount } = await seedDemoStudent(academic);

  logger.info('Seed complete', {
    exercises: exerciseCount,
    questions: questionCount,
    noteTemplates: templateCount,
    demoStudent: student.email,
    demoEnrollments: enrollmentCount,
  });
}

main()
  .catch((error) => {
    logger.error('Seeding failed', { message: error.message, stack: error.stack });
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
    process.exit(process.exitCode || 0);
  });
