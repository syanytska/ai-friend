class MaxHeap:
    # Constructor: Initialize the heap with a fixed capacity.
    # Time Complexity: O(1), Space Complexity: O(1)
    def __init__(self, capacity):
        self.maxSize = capacity
        self.length = 0  # Current number of elements in the heap
        self.heap = [None] * capacity  # Internal array to store heap elements

    # Insert a new value into the heap.
    # Time Complexity: O(log n), Space Complexity: O(1), where n is the number of items in the heap
    def insert(self, value):
        if self.length >= self.maxSize:
            print("heap reach max size, return")
            return
        # Place the new value at the end of the heap
        self.heap[self.length] = value
        # Restore the max-heap property by bubbling up the new value
        self.bubble_up(self.length)
        self.length += 1

    # Helper function to maintain the max-heap property after insertion.
    # Moves the value at position 'pos' up the tree until the heap property is restored.
    # Time Complexity: O(log n), Space Complexity: O(1)
    def bubble_up(self, pos):
        parentPos = int((pos - 1) / 2)
        value = self.heap[pos]
        # While not at the root and the current value is greater than its parent
        while pos > 0 and value > self.heap[parentPos]:
            # Move the parent down
            self.heap[pos] = self.heap[parentPos]
            pos = parentPos
            parentPos = int((parentPos - 1) / 2)
        # Place the value in its correct position
        self.heap[pos] = value