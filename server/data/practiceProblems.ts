import type { PracticeProblem } from "../../shared/schema.js";
import type { SupportedLanguage } from "../../shared/types.js";

type Difficulty = "beginner" | "intermediate" | "advanced";
type ProblemSeed = [
  title: string,
  difficulty: Difficulty,
  category: string,
  description: string,
  inputFormat: string,
  outputFormat: string,
  constraints: string,
  sampleInput: string,
  sampleOutput: string,
  hiddenInput: string,
  hiddenOutput: string,
  hint?: string,
];

const beginners: ProblemSeed[] = [
  ["Even or Odd", "beginner", "conditionals", "Read an integer and classify it as even or odd.", "One integer n.", "Print Even or Odd.", "-10^9 <= n <= 10^9", "8", "Even", "-3", "Odd", "An integer is even when its remainder after division by 2 is zero."],
  ["Largest of Three Numbers", "beginner", "conditionals", "Read three integers and print the largest.", "Three space-separated integers.", "Print the largest value.", "-10^9 <= each value <= 10^9", "4 9 2", "9", "-8 -2 -5", "-2", "Compare each value or update a running maximum."],
  ["Factorial", "beginner", "loops", "Compute n factorial, defined as the product of every integer from 1 through n; 0! is 1.", "One integer n.", "Print n! as an integer.", "0 <= n <= 20", "5", "120", "0", "1", "Multiply a running product by each integer from 2 through n."],
  ["Prime Number Check", "beginner", "number theory", "Determine whether the given integer is prime.", "One integer n.", "Print Yes if n is prime, otherwise No.", "2 <= n <= 10^9", "17", "Yes", "21", "No", "Check divisors only up to the square root of n."],
  ["Reverse a Number", "beginner", "number theory", "Reverse the decimal digits of a non-negative integer. Leading zeroes in the reversed result are omitted.", "One non-negative integer n.", "Print the reversed integer.", "0 <= n <= 10^9", "12040", "4021", "700", "7", "Extract the last digit repeatedly with modulo 10."],
  ["Palindrome Number", "beginner", "number theory", "Determine whether a non-negative integer reads the same forward and backward.", "One non-negative integer n.", "Print Yes or No.", "0 <= n <= 10^9", "12321", "Yes", "120", "No", "Compare the number with its reversed digits."],
  ["Armstrong Number", "beginner", "number theory", "A number is Armstrong when the sum of each digit raised to the number of digits equals the number. Decide whether n has this property.", "One non-negative integer n.", "Print Yes or No.", "0 <= n <= 10^9", "153", "Yes", "154", "No", "Count the digits before summing each digit raised to that count."],
  ["Sum of Digits", "beginner", "number theory", "Print the sum of the decimal digits of a non-negative integer.", "One non-negative integer n.", "Print the digit sum.", "0 <= n <= 10^18", "583", "16", "10000", "1", "Repeatedly add n modulo 10 and divide n by 10."],
  ["Multiplication Table", "beginner", "loops", "Print the first ten positive multiples of n, one per line.", "One integer n.", "Print n x 1 through n x 10, one product per line.", "-10^6 <= n <= 10^6", "7", "7\n14\n21\n28\n35\n42\n49\n56\n63\n70", "-2", "-2\n-4\n-6\n-8\n-10\n-12\n-14\n-16\n-18\n-20", "Use a loop with multipliers from 1 to 10."],
  ["Greatest Common Divisor", "beginner", "number theory", "Find the greatest common divisor of two non-negative integers.", "Two integers a and b.", "Print gcd(a,b).", "0 <= a,b <= 10^18; at least one is positive", "48 18", "6", "17 13", "1", "Use Euclid's algorithm: gcd(a,b) = gcd(b,a mod b)."],
  ["Least Common Multiple", "beginner", "number theory", "Find the least common multiple of two positive integers.", "Two positive integers a and b.", "Print lcm(a,b).", "1 <= a,b <= 10^9", "12 18", "36", "7 5", "35", "Use lcm(a,b) = (a / gcd(a,b)) * b."],
  ["Count Digits", "beginner", "number theory", "Count the decimal digits in a non-negative integer. Zero has one digit.", "One non-negative integer n.", "Print the number of digits.", "0 <= n <= 10^18", "12040", "5", "0", "1", "Handle zero separately, then repeatedly divide by ten."],
  ["String Palindrome", "beginner", "strings", "Determine whether a line of lowercase letters is a palindrome.", "One non-empty lowercase string.", "Print Yes or No.", "1 <= string length <= 100000", "level", "Yes", "universe", "No", "Compare characters from both ends moving inward."],
  ["Find Maximum in Array", "beginner", "arrays", "Find the largest element in an integer array.", "Line 1: n. Line 2: n integers.", "Print the maximum element.", "1 <= n <= 100000; -10^9 <= values <= 10^9", "5\n-4 3 12 0 7", "12", "3\n-9 -2 -11", "-2", "Track the largest value while scanning the array."],
  ["Find Minimum in Array", "beginner", "arrays", "Find the smallest element in an integer array.", "Line 1: n. Line 2: n integers.", "Print the minimum element.", "1 <= n <= 100000; -10^9 <= values <= 10^9", "4\n5 -1 8 2", "-1", "3\n7 4 9", "4", "Track the smallest value while scanning the array."],
  ["Array Sum", "beginner", "arrays", "Compute the sum of all integers in an array.", "Line 1: n. Line 2: n integers.", "Print the sum.", "1 <= n <= 100000; -10^9 <= values <= 10^9", "4\n1 2 3 4", "10", "3\n-5 2 1", "-2", "Add each value to a running total."],
  ["Linear Search", "beginner", "searching", "Find the first zero-based index of target in the array, or -1 if it is absent.", "Line 1: n. Line 2: n integers. Line 3: target.", "Print the first matching index, or -1.", "1 <= n <= 100000", "5\n8 3 6 3 1\n3", "1", "4\n2 4 6 8\n5", "-1", "Scan from left to right and stop at the first match."],
  ["Second Largest Element", "beginner", "arrays", "Print the second-largest distinct value in the array. The input guarantees at least two distinct values.", "Line 1: n. Line 2: n integers.", "Print the second-largest distinct value.", "2 <= n <= 100000", "5\n4 9 9 2 7", "7", "4\n-1 -8 -3 -2", "-2", "Maintain the largest and second-largest distinct values."],
  ["Remove Duplicates", "beginner", "arrays", "Remove repeated integers while preserving the order of their first occurrence.", "Line 1: n. Line 2: n integers.", "Print the unique count, then the remaining values on the next line.", "1 <= n <= 100000", "7\n4 2 4 1 2 3 1", "4\n4 2 1 3", "5\n8 8 8 8 8", "1\n8", "Use a set to record values already emitted."],
  ["Character Frequency", "beginner", "strings", "Count how many times a target character appears in a text line.", "Line 1: one ASCII character. Line 2: a text line.", "Print the number of occurrences.", "Text length <= 100000", "a\nbanana", "3", "z\nCODE UNIVERSE", "0", "Scan the text and increment a counter when a character matches."],
];

const intermediates: ProblemSeed[] = [
  ["Merge Two Sorted Arrays", "intermediate", "arrays", "Merge two non-decreasing integer arrays into one non-decreasing array.", "Line 1: n and m. Line 2: n integers. Line 3: m integers.", "Print all merged values separated by spaces.", "0 <= n,m <= 100000", "3 4\n1 4 8\n2 3 7 9", "1 2 3 4 7 8 9", "2 2\n-4 0\n-3 5", "-4 -3 0 5", "Use two pointers and append the smaller current value."],
  ["Maximum Subarray Sum", "intermediate", "arrays", "Find the largest sum of any non-empty contiguous subarray.", "Line 1: n. Line 2: n integers.", "Print the maximum subarray sum.", "1 <= n <= 200000", "8\n-2 1 -3 4 -1 2 1 -5", "6", "4\n-8 -3 -6 -2", "-2", "Kadane's algorithm keeps the best subarray ending at the current position."],
  ["Move Zeroes", "intermediate", "arrays", "Move all zeroes to the end while preserving the relative order of non-zero values.", "Line 1: n. Line 2: n integers.", "Print the reordered values.", "1 <= n <= 100000", "6\n0 1 0 3 12 0", "1 3 12 0 0 0", "4\n0 0 5 0", "5 0 0 0", "Compact non-zero values to the beginning, then fill the rest with zeroes."],
  ["Rotate Array", "intermediate", "arrays", "Rotate an array to the right by k positions.", "Line 1: n and k. Line 2: n integers.", "Print the rotated array.", "1 <= n <= 100000; 0 <= k <= 10^9", "5 2\n1 2 3 4 5", "4 5 1 2 3", "4 6\n1 2 3 4", "3 4 1 2", "Reduce k modulo n; use slicing or the three-reversal method."],
  ["Anagram Check", "intermediate", "strings", "Determine whether two lowercase strings contain the same characters with the same frequencies.", "Two lines, one string per line.", "Print Yes if they are anagrams, otherwise No.", "Each string length <= 200000", "listen\nsilent", "Yes", "hello\nworld", "No", "Compare character-frequency counts."],
  ["Longest Common Prefix", "intermediate", "strings", "Find the longest prefix shared by every input word.", "Line 1: n. Next n lines: one lowercase word each.", "Print the common prefix, or - if none exists.", "1 <= n <= 1000; total characters <= 200000", "3\nflower\nflow\nflight", "fl", "2\ncat\ndog", "-", "Compare characters at each position until a word differs."],
  ["Valid Parentheses", "intermediate", "stacks", "Check whether a string containing (), [], and {} is balanced and properly nested.", "One string containing only bracket characters.", "Print Yes if valid, otherwise No.", "0 <= string length <= 100000", "({[]})", "Yes", "([)]", "No", "Push opening brackets and match each closing bracket with the stack top."],
  ["First Non-Repeating Character", "intermediate", "hash maps", "Print the first character in a lowercase string that occurs exactly once; print - if no such character exists.", "One non-empty lowercase string.", "Print the first non-repeating character, or -.", "1 <= string length <= 200000", "swiss", "w", "aabbcc", "-", "Count characters, then scan the string in its original order."],
  ["Matrix Transpose", "intermediate", "arrays", "Transpose an r by c matrix.", "Line 1: r and c. Next r lines: c integers each.", "Print c rows with r space-separated values each.", "1 <= r,c <= 200", "2 3\n1 2 3\n4 5 6", "1 4\n2 5\n3 6", "1 2\n-1 7", "-1\n7", "The value at row i, column j becomes row j, column i."],
  ["Matrix Multiplication", "intermediate", "mathematics", "Multiply matrix A (r by c) by matrix B (c by d).", "Line 1: r c d. Next r lines: A. Next c lines: B.", "Print the r by d product matrix.", "1 <= r,c,d <= 50; values fit signed 32-bit integers", "2 2 2\n1 2\n3 4\n5 6\n7 8", "19 22\n43 50", "1 2 1\n2 3\n4\n5", "23\n", "For each output cell, sum A[i][k] * B[k][j] over k."],
  ["Merge Intervals", "intermediate", "sorting", "Merge all overlapping closed intervals.", "Line 1: n. Next n lines: start and end.", "Print the merged interval count, then one interval per line sorted by start.", "1 <= n <= 100000", "4\n1 3\n2 6\n8 10\n15 18", "3\n1 6\n8 10\n15 18", "3\n1 4\n4 7\n8 9", "2\n1 7\n8 9", "Sort by start, then merge when the next start is no greater than the current end."],
  ["Sort Colors", "intermediate", "sorting", "Sort an array containing only 0, 1, and 2 in-place.", "Line 1: n. Line 2: n values, each 0, 1, or 2.", "Print the sorted values.", "1 <= n <= 100000", "6\n2 0 2 1 1 0", "0 0 1 1 2 2", "3\n2 1 0", "0 1 2", "Use three-way partitioning or count each color."],
  ["Sliding Window Maximum", "intermediate", "queues", "For each contiguous window of width k, print its maximum.", "Line 1: n and k. Line 2: n integers.", "Print n-k+1 maxima.", "1 <= k <= n <= 200000", "8 3\n1 3 -1 -3 5 3 6 7", "3 3 5 5 6 7", "5 1\n-2 0 4 1 3", "-2 0 4 1 3", "A deque of indices can maintain candidates in decreasing value order."],
  ["Subarray Sum Equals K", "intermediate", "hash maps", "Count the non-empty contiguous subarrays whose sum equals k.", "Line 1: n and k. Line 2: n integers.", "Print the number of matching subarrays.", "1 <= n <= 200000; values may be negative", "5 3\n1 2 1 2 1", "4", "3 0\n0 0 0", "6", "Count prefix sums; each prior prefix equal to current minus k forms a match."],
  ["Product Except Self", "intermediate", "arrays", "For every index, print the product of all array values except the value at that index. Do not use division.", "Line 1: n. Line 2: n integers.", "Print n products.", "2 <= n <= 100000; results fit signed 64-bit integers", "4\n1 2 3 4", "24 12 8 6", "3\n-1 0 2", "0 -2 0", "Combine prefix and suffix products."],
  ["Search in Rotated Sorted Array", "intermediate", "searching", "Find target in a rotated strictly increasing array, or print -1.", "Line 1: n and target. Line 2: n rotated integers.", "Print target's zero-based index, or -1.", "1 <= n <= 100000; values are distinct", "7 0\n4 5 6 7 0 1 2", "4", "5 3\n5 1 2 3 4", "3", "At each binary-search step, one half remains sorted."],
  ["Generate Parentheses", "intermediate", "recursion", "Generate every well-formed string containing n pairs of parentheses in lexicographic order.", "One integer n.", "Print each result on its own line.", "1 <= n <= 8", "2", "(())\n()()", "1", "()", "Add an opening bracket while openings remain; add a closing bracket only when it stays balanced."],
  ["Reverse a Linked List", "intermediate", "linked lists", "Reverse a singly linked list represented by its node values.", "Line 1: n. Line 2: n integer values.", "Print the values in reversed order.", "0 <= n <= 100000", "5\n1 2 3 4 5", "5 4 3 2 1", "1\n42", "42", "Iteratively redirect each next pointer while tracking the previous node."],
  ["Detect Linked List Cycle", "intermediate", "linked lists", "A list is formed by connecting each node to the next; the final node points to the given zero-based index, or -1 for no cycle. Determine whether a cycle exists.", "Line 1: n. Line 2: n values. Line 3: pos, the cycle target index or -1.", "Print Yes if a cycle exists, otherwise No.", "0 <= n <= 100000", "4\n3 2 0 -4\n1", "Yes", "3\n1 2 3\n-1", "No", "Use Floyd's slow and fast pointer algorithm."],
  ["Implement Stack Using Queues", "intermediate", "stacks", "Process stack commands using queue operations: push x, pop, and top. Pop and top are only called when non-empty.", "Line 1: q. Next q lines: push x, pop, or top.", "Print the result of each pop and top, one per line.", "1 <= q <= 100000", "6\npush 4\npush 9\ntop\npop\ntop\npop", "9\n9\n4\n4", "4\npush 2\npop\npush 7\ntop", "2\n7", "Use one queue and rotate its elements after each push."],
  ["Implement Queue Using Stacks", "intermediate", "queues", "Process queue commands using stack operations: push x, pop, and front. Pop and front are only called when non-empty.", "Line 1: q. Next q lines: push x, pop, or front.", "Print the result of each pop and front, one per line.", "1 <= q <= 100000", "6\npush 4\npush 9\nfront\npop\nfront\npop", "4\n4\n9\n9", "3\npush 8\npop\npush 5", "8", "Use an input stack and an output stack; transfer only when the output stack is empty."],
  ["Binary Tree Traversals", "intermediate", "trees", "Build the binary tree from level-order values, using -1 to represent a missing child. Print preorder, inorder, and postorder traversals.", "Line 1: n. Line 2: n level-order values with -1 for null nodes.", "Print preorder, inorder, and postorder on three lines; print - for an empty traversal.", "1 <= n <= 10000", "7\n1 2 3 -1 4 5 -1", "1 2 4 3 5\n2 4 1 5 3\n4 2 5 3 1", "1\n9", "9\n9\n9", "Preorder visits node-left-right; inorder left-node-right; postorder left-right-node."],
  ["Binary Tree Level Order Traversal", "intermediate", "trees", "Print a binary tree one level at a time from the supplied level-order representation.", "Line 1: n. Line 2: n level-order values with -1 for missing nodes.", "Print each tree level on its own line.", "1 <= n <= 10000", "7\n3 9 20 -1 -1 15 7", "3\n9 20\n15 7", "1\n5", "5", "Use a queue and process the number of nodes currently at each level."],
];

const advanced: ProblemSeed[] = [
  ["Longest Increasing Subsequence", "advanced", "dynamic programming", "Find the length of the longest strictly increasing subsequence.", "Line 1: n. Line 2: n integers.", "Print the subsequence length.", "1 <= n <= 200000", "8\n10 9 2 5 3 7 101 18", "4", "6\n0 1 0 3 2 3", "4", "Maintain the smallest tail for each subsequence length with binary search."],
  ["Longest Common Subsequence", "advanced", "dynamic programming", "Compute the length of a longest common subsequence of two strings.", "Two lines containing strings a and b.", "Print the LCS length.", "0 <= |a|,|b| <= 2000; lowercase letters", "abcde\nace", "3", "abc\nabc", "3", "Use dynamic programming over prefixes of both strings."],
  ["Edit Distance", "advanced", "dynamic programming", "Find the minimum insertions, deletions, and substitutions required to transform string a into string b.", "Two lines containing strings a and b.", "Print the edit distance.", "0 <= |a|,|b| <= 2000; lowercase letters", "horse\nros", "3", "intention\nexecution", "5", "The final characters either match or require one edit operation."],
  ["Coin Change", "advanced", "dynamic programming", "Given coin denominations and a target amount, count combinations that make the amount using unlimited coins; order does not matter.", "Line 1: n and amount. Line 2: n distinct positive coin values.", "Print the number of combinations.", "1 <= n <= 100; 0 <= amount <= 10000; answer fits 64-bit", "3 5\n1 2 5", "4", "1 0\n", "1", "For each coin, update ways for amounts from that coin upward."],
  ["0/1 Knapsack", "advanced", "dynamic programming", "Choose a subset of items with total weight at most capacity and maximum total value. Each item can be chosen at most once.", "Line 1: n and capacity. Next n lines: weight and value.", "Print the maximum value.", "1 <= n <= 200; 0 <= capacity <= 100000", "3 5\n2 3\n3 4\n4 5", "7", "4 0\n1 9\n2 8\n3 7\n4 6", "0", "Update the capacity table in descending order for each item."],
  ["Word Break", "advanced", "dynamic programming", "Determine whether the string can be segmented into one or more words from the supplied dictionary.", "Line 1: string s. Line 2: n. Next n lines: dictionary words.", "Print Yes or No.", "1 <= |s| <= 300; 1 <= n <= 1000", "leetcode\n2\nleet\ncode", "Yes", "catsandog\n5\ncats\ndog\nsand\nand\ncat", "No", "Let dp[i] indicate whether the prefix ending at i can be segmented."],
  ["N-Queens Count", "advanced", "backtracking", "Count the distinct ways to place n queens on an n by n board so that no two attack each other.", "One integer n.", "Print the number of valid boards.", "1 <= n <= 14", "4", "2", "1", "1", "Backtrack row by row while tracking occupied columns and diagonals."],
  ["Sudoku Solver", "advanced", "backtracking", "Solve a valid 9 by 9 Sudoku puzzle. Zeroes represent empty cells; the puzzle has one solution.", "Nine lines, each containing nine digits separated by spaces.", "Print the solved 9 by 9 grid with spaces between digits.", "Each row, column, and 3 by 3 box contains digits 1 through 9 exactly once.", "5 3 0 0 7 0 0 0 0\n6 0 0 1 9 5 0 0 0\n0 9 8 0 0 0 0 6 0\n8 0 0 0 6 0 0 0 3\n4 0 0 8 0 3 0 0 1\n7 0 0 0 2 0 0 0 6\n0 6 0 0 0 0 2 8 0\n0 0 0 4 1 9 0 0 5\n0 0 0 0 8 0 0 7 9", "5 3 4 6 7 8 9 1 2\n6 7 2 1 9 5 3 4 8\n1 9 8 3 4 2 5 6 7\n8 5 9 7 6 1 4 2 3\n4 2 6 8 5 3 7 9 1\n7 1 3 9 2 4 8 5 6\n9 6 1 5 3 7 2 8 4\n2 8 7 4 1 9 6 3 5\n3 4 5 2 8 6 1 7 9", "5 3 4 6 7 8 9 1 2\n6 7 2 1 9 5 3 4 8\n1 9 8 3 4 2 5 6 7\n8 5 9 7 6 1 4 2 3\n4 2 6 8 5 3 7 9 1\n7 1 3 9 2 4 8 5 6\n9 6 1 5 3 7 2 8 4\n2 8 7 4 1 9 6 3 5\n3 4 5 2 8 6 1 7 9", "Try placing only values that are absent from the row, column, and 3 by 3 box."],
  ["Dijkstra Shortest Paths", "advanced", "graphs", "Find shortest distances from source s in a connected undirected graph with non-negative edge weights.", "Line 1: n, m, s. Next m lines: u v weight.", "Print n distances in vertex order.", "1 <= n <= 100000; 0 <= weight <= 10^9", "5 6 0\n0 1 4\n0 2 1\n2 1 2\n1 3 1\n2 3 5\n3 4 3", "0 3 1 4 7", "3 2 1\n0 1 7\n1 2 2", "9 2 0", "Use a min-priority queue and ignore stale distance entries."],
  ["Bellman-Ford", "advanced", "graphs", "Find shortest distances from source s in a directed graph. If a reachable negative cycle exists, print NEGATIVE CYCLE.", "Line 1: n, m, s. Next m lines: directed edge u v weight.", "Print n distances; print INF for unreachable vertices.", "1 <= n <= 500; 0 <= m <= 5000", "5 5 0\n0 1 6\n0 2 7\n1 2 8\n1 3 5\n2 4 -3", "0 6 7 11 4", "3 3 0\n0 1 1\n1 2 -2\n2 1 -2", "NEGATIVE CYCLE", "Relax every edge up to n-1 times, then check for another possible relaxation."],
  ["Floyd-Warshall", "advanced", "graphs", "Compute all-pairs shortest paths in a directed weighted graph. Use -1 to denote no direct edge; diagonal entries are zero.", "Line 1: n. Next n lines: n matrix values.", "Print the n by n distance matrix, using -1 for unreachable pairs.", "1 <= n <= 100; edge weights are non-negative", "3\n0 4 -1\n-1 0 2\n3 -1 0", "0 4 6\n5 0 2\n3 7 0", "2\n0 9\n-1 0", "0 9\n-1 0", "Try every vertex as an intermediate point between each pair."],
  ["Minimum Spanning Tree", "advanced", "graphs", "Find the total weight of a minimum spanning tree of a connected, undirected weighted graph.", "Line 1: n and m. Next m lines: u v weight.", "Print the minimum total tree weight.", "1 <= n <= 100000; 0 <= m <= 200000", "4 5\n0 1 1\n0 2 4\n1 2 2\n1 3 5\n2 3 3", "6", "3 3\n0 1 10\n1 2 2\n0 2 7", "9", "Sort edges by weight and use disjoint-set union to avoid cycles."],
  ["Topological Sort", "advanced", "graphs", "Return the lexicographically smallest topological ordering of a directed acyclic graph.", "Line 1: n and m. Next m lines: directed edge u v.", "Print n vertex IDs in topological order.", "1 <= n <= 100000; the graph is a DAG", "4 4\n0 2\n1 2\n1 3\n2 3", "0 1 2 3", "3 2\n0 2\n1 2", "0 1 2", "Use Kahn's algorithm with a min-priority queue of zero-indegree vertices."],
  ["Strongly Connected Components", "advanced", "graphs", "Count the strongly connected components in a directed graph.", "Line 1: n and m. Next m lines: directed edge u v.", "Print the number of strongly connected components.", "1 <= n <= 100000; 0 <= m <= 200000", "5 5\n0 1\n1 2\n2 0\n1 3\n3 4", "3", "4 4\n0 1\n1 0\n2 3\n3 2", "2", "Use Kosaraju's two DFS passes or Tarjan's algorithm."],
  ["Trie Prefix Queries", "advanced", "tries", "Insert n lowercase words into a trie, then answer q prefix queries with the number of inserted words beginning with each prefix.", "Line 1: n and q. Next n lines: words. Next q lines: prefixes.", "Print the count for each prefix query.", "1 <= n,q <= 100000; total characters <= 200000", "4 3\napple\napp\nape\nbat\nap\napp\nb", "3\n2\n1", "2 2\ncat\ncar\nca\nz", "2\n0", "Store a word count at every trie node reached by an inserted word."],
  ["Segment Tree Range Sum", "advanced", "trees", "Build an array supporting point updates and inclusive range-sum queries.", "Line 1: n and q. Line 2: n integers. Next q lines: set i value or sum left right.", "For every sum command, print the range sum on its own line.", "1 <= n,q <= 100000; values and sums fit signed 64-bit", "5 4\n1 2 3 4 5\nsum 1 3\nset 2 10\nsum 0 2\nsum 2 4", "9\n13\n19", "3 2\n-1 4 7\nsum 0 2\nset 1 0", "10", "Each tree node stores the sum of its segment; update only the path to one leaf."],
  ["Fenwick Tree Range Sum", "advanced", "trees", "Support point additions and inclusive range-sum queries with a Fenwick tree.", "Line 1: n and q. Line 2: n initial values. Next q lines: add index delta or sum left right.", "For each sum command, print the range sum.", "1 <= n,q <= 100000", "5 4\n1 2 3 4 5\nsum 1 3\nadd 2 7\nsum 0 2\nsum 2 4", "9\n13\n19", "2 2\n5 -2\nsum 0 1\nadd 1 4", "3", "A prefix query combines tree nodes by removing the lowest set bit."],
  ["LRU Cache", "advanced", "hash maps", "Simulate an LRU cache of capacity c. get x prints the stored value or -1; put x value inserts or replaces a key and evicts the least recently used entry when needed.", "Line 1: capacity c and operation count q. Next q lines: get x or put x value.", "Print one line for each get operation.", "1 <= c <= 10000; 1 <= q <= 200000", "2 7\nput 1 10\nput 2 20\nget 1\nput 3 30\nget 2\nput 4 40\nget 1", "10\n-1\n-1", "1 3\nput 4 8\nget 4\nget 2", "8\n-1", "Combine a hash map with a doubly linked list ordered by recency."],
  ["Largest Rectangle in Histogram", "advanced", "stacks", "Find the largest rectangle that fits under the histogram bars.", "Line 1: n. Line 2: n non-negative heights.", "Print the maximum rectangle area.", "1 <= n <= 200000; 0 <= height <= 10^9", "6\n2 1 5 6 2 3", "10", "4\n2 4 4 2", "8", "A monotonic stack finds the first smaller bar on each side."],
  ["Trapping Rain Water", "advanced", "arrays", "Given elevation heights, calculate how much rainwater can be trapped between bars.", "Line 1: n. Line 2: n non-negative heights.", "Print the total trapped water.", "1 <= n <= 200000; 0 <= height <= 10^9", "12\n0 1 0 2 1 0 1 3 2 1 2 1", "6", "6\n4 2 0 3 2 5", "9", "At each position, trapped water depends on the smaller of the maximum heights on either side."],
  ["Maximum Flow", "advanced", "graphs", "Find the maximum flow from source 0 to sink n-1 in a directed network with non-negative capacities.", "Line 1: n and m. Next m lines: u v capacity.", "Print the maximum flow value.", "2 <= n <= 500; 0 <= m <= 5000; capacity <= 10^9", "4 5\n0 1 3\n0 2 2\n1 2 1\n1 3 2\n2 3 4", "5", "3 3\n0 1 7\n1 2 5\n0 2 2", "7", "Use residual edges and repeatedly augment a path (Edmonds-Karp is sufficient for these limits)."],
  ["Shortest Path in a Grid", "advanced", "graphs", "Find the minimum number of moves from S to E in a grid; # cells are blocked and movement is allowed in four directions.", "Line 1: rows and columns. Next rows lines: grid containing S, E, ., and #.", "Print the minimum number of moves, or -1 if E is unreachable.", "1 <= rows,columns <= 1000; at most 10^6 cells", "3 4\nS...\n.##.\n...E", "5", "2 3\nS##\n##E", "-1", "Breadth-first search finds the shortest path in an unweighted grid."],
  ["Traveling Salesperson", "advanced", "dynamic programming", "Starting at city 0, visit every city exactly once and return to city 0 with minimum total cost.", "Line 1: n. Next n lines: n non-negative travel costs; diagonal is zero.", "Print the minimum tour cost.", "2 <= n <= 15; costs <= 10^6", "4\n0 10 15 20\n10 0 35 25\n15 35 0 30\n20 25 30 0", "80", "3\n0 2 9\n1 0 6\n15 7 0", "17", "Use bitmask dynamic programming for subsets of visited cities."],
  ["Wildcard Pattern Matching", "advanced", "dynamic programming", "Match text s against pattern p where ? matches one character and * matches any sequence, including empty.", "Line 1: text s. Line 2: pattern p.", "Print Yes if the entire text matches, otherwise No.", "0 <= |s|,|p| <= 2000; lowercase letters, ? and *", "adceb\n*a*b", "Yes", "acdcb\na*c?b", "No", "For *, consider matching no character or consuming one more text character."],
  ["Articulation Points", "advanced", "graphs", "Find all articulation points: vertices whose removal increases the number of connected components in the undirected graph.", "Line 1: n and m. Next m lines: undirected edge u v.", "Print articulation point count, then sorted vertex IDs on the next line; print - when none exist.", "1 <= n <= 100000; 0 <= m <= 200000", "5 5\n0 1\n1 2\n2 0\n1 3\n3 4", "2\n1 3", "3 2\n0 1\n1 2", "1\n1", "A DFS discovery time and low-link value identify critical tree edges."],
];

const executableLanguages: SupportedLanguage[] = [
  "python", "c", "cpp", "java", "javascript", "typescript",
];

function starterCode(title: string, language: SupportedLanguage): string {
  const comment = language === "python" ? `# ${title}` :
    language === "sql" ? `-- ${title}` :
      `// ${title}`;

  switch (language) {
    case "python":
      return `${comment}\nimport sys\n\ndata = sys.stdin.read().split()\n# Parse the input and print the required result.\n`;
    case "javascript":
      return `${comment}\nconst fs = require("node:fs");\nconst input = fs.readFileSync(0, "utf8").trim().split(/\\s+/);\n// Parse the input and print the required result.\n`;
    case "typescript":
      return `${comment}\nimport * as fs from "node:fs";\nconst input = fs.readFileSync(0, "utf8").trim().split(/\\s+/);\n// Parse the input and print the required result.\n`;
    case "java":
      return `${comment}\nimport java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    // Parse the input and print the required result.\n  }\n}\n`;
    case "c":
      return `${comment}\n#include <stdio.h>\n#include <stdlib.h>\nint main(void) {\n  // Parse the input and print the required result.\n  return 0;\n}\n`;
    case "cpp":
      return `${comment}\n#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  // Parse the input and print the required result.\n  return 0;\n}\n`;
    default:
      return comment;
  }
}

function makeProblem(seed: ProblemSeed, id: number): PracticeProblem {
  const [title, difficulty, category, description, inputFormat, outputFormat, constraints, sampleInput, sampleOutput, hiddenInput, hiddenOutput, hint] = seed;
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return {
    id,
    title,
    slug,
    difficulty,
    category,
    description,
    inputFormat,
    outputFormat,
    constraints,
    examples: [{
      input: sampleInput,
      output: sampleOutput,
      explanation: `${description} For this input, the required result is ${sampleOutput.split("\n").length > 1 ? "shown in the output above" : `\`${sampleOutput}\``}.`,
    }],
    supportedLanguages: executableLanguages,
    starterCode: Object.fromEntries(executableLanguages.map((language) => [language, starterCode(title, language)])),
    testCases: [
      { input: sampleInput, expected: sampleOutput, hidden: false },
      { input: hiddenInput, expected: hiddenOutput, hidden: true },
    ],
    hints: [hint || "Use the constraints to choose an efficient approach."],
    createdAt: new Date(),
  };
}

const seeds = [...beginners, ...intermediates, ...advanced].map((seed) => {
  if (seed[0] === "Sudoku Solver" && seed.length === 11) {
    return [
      seed[0], seed[1], seed[2], seed[3], seed[4], seed[5], seed[6],
      seed[7], seed[8], seed[8], seed[9] || "", seed[10] || "",
    ] as ProblemSeed;
  }
  return seed;
});

if (beginners.length !== 20 || intermediates.length !== 23 || advanced.length !== 25) {
  throw new Error("Practice seed difficulty counts are invalid.");
}
if (new Set(seeds.map(([title]) => title.toLowerCase())).size !== seeds.length) {
  throw new Error("Practice seed contains duplicate problem titles.");
}

export const expandedPracticeProblems = seeds.map((seed, index) => makeProblem(seed, index + 9));
