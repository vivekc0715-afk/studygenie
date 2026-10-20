'use strict';

/**
 * Intelligent AI Chatbot Assistant for BCA Students.
 *
 * Provides instant, high-quality, prebuilt answers for common BCA / Computer Science
 * interview, lab, and university exam questions with code snippets, complexity analysis,
 * and GeeksforGeeks reference links.
 *
 * Employs keyword / intent matching, topic-based categorization, and optional Gemini AI
 * augmentation if an API key is available.
 */

const gemini = require('./geminiClient');
const { features } = require('../../config/env');
const logger = require('../../config/logger');

const PREBUILT_ANSWERS = [
  {
    id: 'stack-vs-queue',
    category: 'Data Structures',
    keywords: ['stack', 'queue', 'lifo', 'fifo', 'difference between stack and queue', 'stack vs queue'],
    question: 'What is the difference between a Stack and a Queue?',
    summary: 'Comparison of Stack (LIFO) and Queue (FIFO), their operations, time complexity, and real-world applications.',
    response: `### Stack vs Queue: Core Differences & Operations

| Feature | Stack | Queue |
| :--- | :--- | :--- |
| **Principle** | **LIFO** (Last In, First Out) | **FIFO** (First In, First Out) |
| **Insertion** | \`push()\` at the **Top** | \`enqueue()\` at the **Rear** |
| **Deletion** | \`pop()\` from the **Top** | \`dequeue()\` from the **Front** |
| **Inspection** | \`peek()\` / \`top()\` | \`front()\` / \`rear()\` |
| **Pointers** | Only 1 pointer (\`top\`) | 2 pointers (\`front\` and \`rear\`) |
| **Time Complexity** | $O(1)$ for push, pop, peek | $O(1)$ for enqueue, dequeue |

#### Real-World Applications:
- **Stack:** Function call stack (recursion), Undo/Redo in text editors, Expression evaluation (infix to postfix), Browser back button.
- **Queue:** CPU scheduling (Round Robin), Printer spooling, BFS graph traversal, Operating system buffer queues.

> 📚 **GeeksforGeeks Reference:** [Differences between Stack and Queue Data Structures](https://www.geeksforgeeks.org/difference-between-stack-and-queue-data-structures/)`,
    suggestions: ['How to implement Stack using Array?', 'Explain Circular Queue', 'Infix to Postfix conversion']
  },
  {
    id: 'oops-four-pillars',
    category: 'Object Oriented Programming',
    keywords: ['oops', 'oop', 'pillars', 'encapsulation', 'abstraction', 'inheritance', 'polymorphism', 'object oriented'],
    question: 'What are the 4 fundamental pillars of Object-Oriented Programming (OOP)?',
    summary: 'Detailed explanation of Encapsulation, Abstraction, Inheritance, and Polymorphism with Java / C++ examples.',
    response: `### The 4 Pillars of Object-Oriented Programming (OOP)

OOP organizes software design around **data or objects** rather than functions and logic.

#### 1. Encapsulation (Data Hiding)
Wrapping data (variables) and code (methods) together into a single unit (class) and restricting direct access using \`private\` or \`protected\` access specifiers.
- **Example:** Declaring class attributes \`private\` and providing \`public\` getters/setters.

#### 2. Abstraction (Hiding Complexity)
Displaying only essential features to the user while hiding internal implementation details.
- **Example:** In Java/C++, achieved using **Abstract Classes** and **Interfaces**. When you call \`drive()\`, you don't need to know internal engine combustion mechanics.

#### 3. Inheritance (Code Reusability)
Mechanism where a child (derived) class acquires properties and behaviors from a parent (base) class.
- **Types:** Single, Multilevel, Multiple (via Interfaces in Java), Hierarchical, Hybrid.
- **Keywords:** \`extends\` (Java), \`:\` (C++).

#### 4. Polymorphism (Many Forms)
The ability of a message, method, or operator to be processed in more than one form.
- **Compile-time (Static):** Method Overloading and Operator Overloading.
- **Run-time (Dynamic):** Method Overriding using \`virtual\` functions in C++ or dynamic method dispatch in Java.

> 📚 **GeeksforGeeks Reference:** [4 Pillars of Object Oriented Programming](https://www.geeksforgeeks.org/four-main-object-oriented-programming-concepts-of-java/)`,
    suggestions: ['Overloading vs Overriding', 'Abstract Class vs Interface', 'Multiple Inheritance in Java']
  },
  {
    id: 'dbms-normalization',
    category: 'Database Management',
    keywords: ['normalization', 'normal form', '1nf', '2nf', '3nf', 'bcnf', 'anomalies', 'dbms'],
    question: 'What is Normalization in DBMS? Explain 1NF, 2NF, 3NF, and BCNF.',
    summary: 'Understanding Normal Forms to eliminate data redundancy and insertion, deletion, and update anomalies.',
    response: `### Database Normalization: 1NF to BCNF

**Normalization** is the systematic process of structuring relational database tables to minimize redundancy and prevent **insertion, deletion, and update anomalies**.

---

#### 1. First Normal Form (1NF)
- **Rule:** Every column must hold **atomic (indivisible) values**.
- **Requirement:** No repeating groups or comma-separated lists in any row.

#### 2. Second Normal Form (2NF)
- **Rule:** Must be in **1NF** AND **No Partial Dependency**.
- **Explanation:** Every non-prime attribute must depend on the **entire** candidate key, not just part of a composite key.

#### 3. Third Normal Form (3NF)
- **Rule:** Must be in **2NF** AND **No Transitive Dependency**.
- **Explanation:** Non-key attributes must NOT depend on other non-key attributes ($X \\to Y$ and $Y \\to Z$). "The key, the whole key, and nothing but the key."

#### 4. Boyce-Codd Normal Form (BCNF / 3.5NF)
- **Rule:** For every functional dependency $X \\to Y$, $X$ must be a **Super Key**.
- **Note:** Stricter version of 3NF handling anomalies from overlapping candidate keys.

> 📚 **GeeksforGeeks Reference:** [Introduction of Database Normalization](https://www.geeksforgeeks.org/introduction-of-database-normalization/)`,
    suggestions: ['Difference between 3NF and BCNF', 'What is Lossless Join Decomposition?', 'What are ACID properties?']
  },
  {
    id: 'acid-properties',
    category: 'Database Management',
    keywords: ['acid', 'atomicity', 'consistency', 'isolation', 'durability', 'transactions', 'dbms'],
    question: 'What are ACID properties in DBMS?',
    summary: 'Detailed explanation of Atomicity, Consistency, Isolation, and Durability in database transactions.',
    response: `### ACID Properties in Database Transactions

An ACID transaction is a unit of program execution that accesses and possibly updates various database items.

1. **A - Atomicity ("All or Nothing"):**  
   Either all operations of the transaction are committed successfully, or the entire transaction is rolled back. If power fails halfway through a bank transfer, no money is lost.
2. **C - Consistency:**  
   The database must remain in a valid state before and after the transaction execution, preserving all schema constraints.
3. **I - Isolation:**  
   Multiple transactions executing concurrently must not interfere with each other. Intermediate states of transaction $T_1$ are invisible to $T_2$.
4. **D - Durability:**  
   Once a transaction has committed, its changes are permanently recorded in non-volatile storage (disk), even across system crashes.

> 📚 **GeeksforGeeks Reference:** [ACID Properties in DBMS](https://www.geeksforgeeks.org/acid-properties-in-dbms/)`,
    suggestions: ['Explain Two-Phase Locking (2PL)', 'Concurrency control protocols', 'Deadlock in DBMS']
  },
  {
    id: 'osi-7-layers',
    category: 'Computer Networks',
    keywords: ['osi', 'layers', 'networking', 'tcp/ip', 'physical layer', 'transport layer', 'model'],
    question: 'Explain the 7 Layers of the OSI Reference Model.',
    summary: 'Step-by-step breakdown of Physical, Data Link, Network, Transport, Session, Presentation, and Application layers.',
    response: `### The 7 Layers of OSI (Open Systems Interconnection)

**Mnemonic (Top to Bottom):** *"All People Seem To Need Data Processing"*  
**Mnemonic (Bottom to Top):** *"Please Do Not Throw Sausage Pizza Away"*

1. **Layer 7 - Application Layer:** User interface & network applications (HTTP, HTTPS, FTP, DNS, SMTP).
2. **Layer 6 - Presentation Layer:** Translation, data compression, and encryption/decryption (SSL/TLS, ASCII, JPEG).
3. **Layer 5 - Session Layer:** Establishes, maintains, and synchronizes dialogue between applications.
4. **Layer 4 - Transport Layer:** End-to-end reliability, segmentation, port addressing, flow & error control (**TCP, UDP**). PDU: *Segment*.
5. **Layer 3 - Network Layer:** Routing and logical addressing (**IPv4, IPv6, ICMP, Routers**). PDU: *Packet*.
6. **Layer 2 - Data Link Layer (DLL):** Framing, physical addressing (**MAC Address, Switches, CRC Error Check**). PDU: *Frame*.
7. **Layer 1 - Physical Layer:** Transmits raw bitstream over physical transmission media (cables, radio waves, optical fiber, hubs). PDU: *Bits*.

> 📚 **GeeksforGeeks Reference:** [Layers of OSI Model](https://www.geeksforgeeks.org/layers-of-osi-model/)`,
    suggestions: ['Difference between TCP and UDP', 'OSI vs TCP/IP model', 'What is Subnetting?']
  },
  {
    id: 'tcp-vs-udp',
    category: 'Computer Networks',
    keywords: ['tcp', 'udp', 'transport', 'handshake', 'connection oriented', 'tcp vs udp'],
    question: 'What is the difference between TCP and UDP?',
    summary: 'Comparison of Transmission Control Protocol (reliable) and User Datagram Protocol (speed-oriented).',
    response: `### TCP vs UDP: Key Differences

| Feature | TCP (Transmission Control Protocol) | UDP (User Datagram Protocol) |
| :--- | :--- | :--- |
| **Connection Type** | Connection-oriented (3-Way Handshake) | Connectionless |
| **Reliability** | **Guaranteed delivery** with ACKs & retransmissions | Best-effort delivery; packets may be lost |
| **Ordering** | Guarantees packets arrive in exact order | Packets may arrive out of order |
| **Speed / Overhead** | Slower (20–60 byte header, congestion control) | **Fast & lightweight** (8 byte fixed header) |
| **Flow & Error Control**| Yes (sliding window, checksums, timeout) | Error detection only (checksum), no flow control |
| **Use Cases** | Web browsing (HTTP/HTTPS), Email (SMTP), File transfer (FTP) | Video streaming, Online gaming (VoIP, DNS, DHCP) |

#### TCP 3-Way Handshake:
1. **Client $\\to$ Server:** \`SYN\` (Synchronize sequence number)
2. **Server $\\to$ Client:** \`SYN-ACK\` (Acknowledge and synchronize)
3. **Client $\\to$ Server:** \`ACK\` (Connection Established)

> 📚 **GeeksforGeeks Reference:** [Differences between TCP and UDP](https://www.geeksforgeeks.org/differences-between-tcp-and-udp/)`,
    suggestions: ['How does TCP Congestion Control work?', 'Explain Port Numbers in Networking', 'DNS resolution process']
  },
  {
    id: 'os-process-vs-thread',
    category: 'Operating Systems',
    keywords: ['process', 'thread', 'multithreading', 'concurrency', 'process vs thread', 'pcb'],
    question: 'What is the difference between a Process and a Thread?',
    summary: 'Understanding Process (heavyweight independent execution) vs Thread (lightweight unit of execution).',
    response: `### Process vs Thread in Operating Systems

A **Process** is a program in execution containing its own dedicated address space, while a **Thread** is a lightweight unit of execution within a process that shares resources.

| Feature | Process | Thread |
| :--- | :--- | :--- |
| **Memory** | Isolated virtual address space per process | Threads of the same process share code, data, and files |
| **Context Switching**| Slower (requires switching memory maps & registers) | **Much faster** (shares memory space) |
| **Communication** | Inter-Process Communication (IPC: pipes, sockets, shared memory) | Fast direct memory access (variables/heaps) |
| **Failure Impact** | If one process crashes, others remain unaffected | If one thread crashes, it may terminate the entire process |
| **Creation Cost** | High system resource overhead | Low overhead |

> 📚 **GeeksforGeeks Reference:** [Difference between Process and Thread](https://www.geeksforgeeks.org/difference-between-process-and-thread/)`,
    suggestions: ['What is Process Control Block (PCB)?', 'Explain Context Switching', 'CPU Scheduling Algorithms']
  },
  {
    id: 'os-deadlock',
    category: 'Operating Systems',
    keywords: ['deadlock', 'coffman', 'banker', 'starvation', 'deadlock conditions'],
    question: 'What is Deadlock? What are the 4 Coffman conditions for Deadlock?',
    summary: 'Deadlock definition, Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait, and Banker\'s Algorithm.',
    response: `### Deadlock & The 4 Necessary Coffman Conditions

A **Deadlock** is a state where a set of processes are blocked because each process is holding a resource and waiting for another resource acquired by some other process.

#### The 4 Necessary Conditions (Coffman Conditions):
1. **Mutual Exclusion:** At least one resource must be held in a non-shareable mode (only one process can use it at a time).
2. **Hold and Wait:** A process must currently be holding at least one resource and requesting additional resources held by others.
3. **No Preemption:** Resources cannot be forcibly taken away from a process; they can only be released voluntarily upon completion.
4. **Circular Wait:** A closed chain of processes exists such that $P_0$ waits for resource held by $P_1$, $P_1$ waits for $P_2$, ..., and $P_n$ waits for $P_0$.

#### Deadlock Handling Strategies:
- **Deadlock Prevention:** Invalidate at least one of the 4 Coffman conditions.
- **Deadlock Avoidance:** Use **Banker's Algorithm** (ensuring system is always in a "Safe State").
- **Deadlock Detection & Recovery:** Allow deadlock to occur, detect via Resource Allocation Graph (RAG), and recover by terminating processes or preemption.
- **Ignoration (Ostrich Algorithm):** Pretend deadlocks never occur (used in Windows & Linux for performance).

> 📚 **GeeksforGeeks Reference:** [Deadlock in Operating System](https://www.geeksforgeeks.org/introduction-of-deadlock-in-operating-system/)`,
    suggestions: ['Explain Banker\'s Algorithm with example', 'What is Semaphore and Mutex?', 'Paging vs Segmentation']
  },
  {
    id: 'dsa-binary-search-tree',
    category: 'Data Structures',
    keywords: ['bst', 'binary search tree', 'tree traversal', 'inorder', 'preorder', 'postorder', 'dsa'],
    question: 'What is a Binary Search Tree (BST)? Explain its properties and traversals.',
    summary: 'BST definition, Left < Root < Right property, Inorder traversal yields sorted order, search and insertion time complexity.',
    response: `### Binary Search Tree (BST)

A **Binary Search Tree** is a node-based binary tree data structure with the following ordering invariant for every node:
1. The left subtree contains only nodes with keys **less than** the node's key.
2. The right subtree contains only nodes with keys **greater than** the node's key.
3. Both left and right subtrees must also be Binary Search Trees.

#### Tree Traversals:
- **Inorder (Left $\\to$ Root $\\to$ Right):** Produces values in **strictly non-decreasing (sorted) order**!
- **Preorder (Root $\\to$ Left $\\to$ Right):** Useful for creating a copy or prefix serialization of the tree.
- **Postorder (Left $\\to$ Right $\\to$ Root):** Useful for deleting the tree or evaluating postfix expressions.
- **Level Order (BFS):** Traversal level by level using a Queue.

#### Time Complexity:
- **Balanced BST (e.g. AVL, Red-Black):** Search, Insert, Delete = $O(\\log N)$.
- **Skewed BST (Worst Case):** Becomes like a linked list = $O(N)$.

\`\`\`c
// Inorder traversal implementation in C
void inorder(struct Node* root) {
    if (root != NULL) {
        inorder(root->left);
        printf("%d ", root->data);
        inorder(root->right);
    }
}
\`\`\`

> 📚 **GeeksforGeeks Reference:** [Binary Search Tree Data Structure](https://www.geeksforgeeks.org/binary-search-tree-data-structure/)`,
    suggestions: ['Explain AVL Tree Rotations', 'Binary Tree vs BST', 'Graph BFS and DFS']
  },
  {
    id: 'bca-exam-tips',
    category: 'Exam Preparation',
    keywords: ['exam tips', 'study tips', 'bca score', 'how to prepare', 'good marks', 'revision', 'exam'],
    question: 'How to score 85%+ in BCA University Semester Exams?',
    summary: 'Top proven strategies for BCA theory papers, coding practicals, diagrams, and time management.',
    response: `### Top 6 Strategies to Score 85%+ in BCA Semester Exams

1. **Follow the Standard 5-Part Answer Structure (For 10/15-mark questions):**
   - **Definition & Core Concept** (1-2 clear introductory paragraphs)
   - **Neat Block Diagram / Architecture** (Examiners look for visual representations)
   - **Key Features / Properties Table** (Structured tabular comparison)
   - **Code Implementation or Pseudocode** (In C, C++, Java, or Python with comments)
   - **Advantages, Limitations, and Real-World Applications**

2. **Master Previous 5 Years Question Papers (PYQs):**
   - 60–70% of theory topics in BCA (such as Normalization, OSI Model, CPU Scheduling, OOP Pillars, Linked List operations) recur frequently.

3. **Practice Dry-Running Algorithms on Paper:**
   - Practice drawing recursion call stacks, tracing sorting passes (Bubble, QuickSort), and calculating CPU scheduling Gantt charts.

4. **Lab Exam Secret:**
   - Write clean indentation and handle edge cases (e.g., checking \`head == NULL\` in linked lists, division by zero, null pointer checks).

5. **Utilize BCA SmartLearn AI & GeeksforGeeks:**
   - Use our **Notes Generator (Quick Revision)** the night before exams, and practice coding on the sandboxed Compiler.`,
    suggestions: ['How to prepare for Data Structures exam?', 'Database design exam checklist', 'Java viva common questions']
  }
];

/**
 * Searches the prebuilt knowledge base for the most relevant answer using keyword & intent matching.
 */
function findPrebuiltAnswer(userQuery) {
  if (!userQuery || typeof userQuery !== 'string') return null;
  const normalized = userQuery.toLowerCase().trim();

  // 1. Direct keyword match with scoring
  let bestMatch = null;
  let highestScore = 0;

  for (const item of PREBUILT_ANSWERS) {
    let score = 0;

    // Check exact question match
    if (normalized.includes(item.question.toLowerCase())) {
      score += 15;
    }

    // Check keyword matches
    for (const keyword of item.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += keyword.length > 5 ? 5 : 3;
      }
    }

    if (score > highestScore && score >= 3) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
}

/**
 * Handles incoming chat message from student:
 * 1. Matches prebuilt answer.
 * 2. If no exact match and Gemini is configured, calls Gemini.
 * 3. Falls back gracefully to recommended topics and best related answer.
 */
async function answerChatQuestion({ message, conversationHistory = [] }) {
  const query = String(message || '').trim();

  // Try finding a prebuilt answer first
  const prebuilt = findPrebuiltAnswer(query);
  if (prebuilt) {
    return {
      answer: prebuilt.response,
      matchedTopic: prebuilt.question,
      category: prebuilt.category,
      suggestions: prebuilt.suggestions,
      source: 'prebuilt',
    };
  }

  // If Gemini is configured and available, ask Gemini
  if (features.ai) {
    try {
      const prompt = `You are the BCA SmartLearn AI Academic Tutor. A BCA (Bachelor of Computer Applications) student asked:
"${query}"

Provide a structured, helpful, student-friendly answer formatted in clean GitHub Markdown:
1. Clear explanation with core definition
2. Tabular comparison or bullet points where relevant
3. Code snippet (C, Java, Python, or SQL) if relevant
4. Reference to GeeksforGeeks for deep reading
Keep the tone encouraging, clear, and focused on university academic success.`;

      const result = await gemini.generate({
        prompt,
        systemInstruction: 'You are an expert Computer Science university professor and BCA study mentor.',
        temperature: 0.6,
        maxOutputTokens: 2048,
      });

      if (result?.text) {
        return {
          answer: result.text,
          matchedTopic: 'AI Tutor Response',
          category: 'AI Generated',
          suggestions: [
            'Explain with a code example',
            'What are common exam questions on this?',
            'Show GeeksforGeeks reference notes',
          ],
          source: 'gemini',
        };
      }
    } catch (err) {
      logger.warn('Gemini chat generation failed; using fallback catalogue.', { message: err.message });
    }
  }

  // Fallback: Provide helpful response with top suggestions
  const defaultItem = PREBUILT_ANSWERS[0];
  return {
    answer: `Here is information on **${defaultItem.question}**:\n\n${defaultItem.response}\n\n---\n*You can also ask about Data Structures, DBMS Normalization, OSI 7-Layer Model, CPU Scheduling, OOP Pillars, or BCA Exam Tips!*`,
    matchedTopic: defaultItem.question,
    category: defaultItem.category,
    suggestions: [
      'What are the 4 pillars of OOP?',
      'Explain DBMS Normalization (1NF, 2NF, 3NF)',
      'Explain the 7 layers of OSI model',
      'What is the difference between TCP and UDP?',
      'How to score 85%+ in BCA exams?',
    ],
    source: 'prebuilt_fallback',
  };
}

module.exports = {
  PREBUILT_ANSWERS,
  findPrebuiltAnswer,
  answerChatQuestion,
};
