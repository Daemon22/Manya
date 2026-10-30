/**
 * @manya-os/cortex — goal management tests.
 *
 * Copyright 2024 Manya Hael Foundation. All rights reserved.
 * Licensed under the Apache License, Version 2.0.
 */

import { GoalManager, GoalError } from '../src';

describe('GoalManager', () => {
  test('create goal', () => {
    const g = new GoalManager();
    const goal = g.create('do something');
    expect(goal.id).toBeDefined();
    expect(goal.status).toBe('pending');
    expect(goal.description).toBe('do something');
  });

  test('create goal with options', () => {
    const g = new GoalManager();
    const goal = g.create('do something', { priority: 0.8, deadline: 5000, successCriteria: ['done'] });
    expect(goal.priority).toBe(0.8);
    expect(goal.deadline).toBe(5000);
    expect(goal.successCriteria).toEqual(['done']);
  });

  test('create throws on empty description', () => {
    const g = new GoalManager();
    expect(() => g.create('')).toThrow(GoalError);
  });

  test('get returns goal by id', () => {
    const g = new GoalManager();
    const goal = g.create('do something');
    expect(g.get(goal.id)).toBe(goal);
  });

  test('get returns undefined for unknown id', () => {
    const g = new GoalManager();
    expect(g.get('missing')).toBeUndefined();
  });

  test('transition status', () => {
    const g = new GoalManager();
    const goal = g.create('do something');
    g.transition(goal.id, 'active');
    expect(g.get(goal.id)?.status).toBe('active');
  });

  test('invalid transition throws', () => {
    const g = new GoalManager();
    const goal = g.create('do something');
    g.transition(goal.id, 'active');
    g.transition(goal.id, 'achieved');
    expect(() => g.transition(goal.id, 'active')).toThrow(GoalError);
  });

  test('pending can transition to active', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    expect(() => g.transition(goal.id, 'active')).not.toThrow();
  });

  test('pending can transition to abandoned', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    expect(() => g.transition(goal.id, 'abandoned')).not.toThrow();
  });

  test('active can transition to blocked', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    g.transition(goal.id, 'active');
    expect(() => g.transition(goal.id, 'blocked')).not.toThrow();
  });

  test('active can transition to achieved', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    g.transition(goal.id, 'active');
    expect(() => g.transition(goal.id, 'achieved')).not.toThrow();
  });

  test('blocked can transition to active', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    g.transition(goal.id, 'active');
    g.transition(goal.id, 'blocked');
    expect(() => g.transition(goal.id, 'active')).not.toThrow();
  });

  test('achieved cannot transition', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    g.transition(goal.id, 'active');
    g.transition(goal.id, 'achieved');
    expect(() => g.transition(goal.id, 'active')).toThrow(GoalError);
  });

  test('abandoned cannot transition', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    g.transition(goal.id, 'abandoned');
    expect(() => g.transition(goal.id, 'active')).toThrow(GoalError);
  });

  test('transition throws on unknown id', () => {
    const g = new GoalManager();
    expect(() => g.transition('missing', 'active')).toThrow(GoalError);
  });

  test('active returns sorted by priority', () => {
    const g = new GoalManager();
    const a = g.create('a', { priority: 0.3 });
    const b = g.create('b', { priority: 0.9 });
    g.transition(a.id, 'active');
    g.transition(b.id, 'active');
    const active = g.active();
    expect(active[0].id).toBe(b.id);
  });

  test('active returns only active goals', () => {
    const g = new GoalManager();
    const a = g.create('a');
    const b = g.create('b');
    g.transition(a.id, 'active');
    g.transition(b.id, 'abandoned');
    expect(g.active()).toHaveLength(1);
    expect(g.active()[0].id).toBe(a.id);
  });

  test('children of parent', () => {
    const g = new GoalManager();
    const parent = g.create('parent');
    g.create('child1', { parentId: parent.id });
    g.create('child2', { parentId: parent.id });
    expect(g.children(parent.id)).toHaveLength(2);
  });

  test('children returns empty for no children', () => {
    const g = new GoalManager();
    const parent = g.create('parent');
    expect(g.children(parent.id)).toHaveLength(0);
  });

  test('invalid parent throws', () => {
    const g = new GoalManager();
    expect(() => g.create('x', { parentId: 'missing' })).toThrow(GoalError);
  });

  test('overdue goals', () => {
    const g = new GoalManager();
    const goal = g.create('overdue', { deadline: Date.now() - 1000 });
    g.transition(goal.id, 'active');
    expect(g.overdue()).toHaveLength(1);
  });

  test('overdue excludes achieved goals', () => {
    const g = new GoalManager();
    const goal = g.create('overdue', { deadline: Date.now() - 1000 });
    g.transition(goal.id, 'active');
    g.transition(goal.id, 'achieved');
    expect(g.overdue()).toHaveLength(0);
  });

  test('overdue excludes goals without deadline', () => {
    const g = new GoalManager();
    const goal = g.create('no deadline');
    g.transition(goal.id, 'active');
    expect(g.overdue()).toHaveLength(0);
  });

  test('setPriority updates priority', () => {
    const g = new GoalManager();
    const goal = g.create('x', { priority: 0.3 });
    g.setPriority(goal.id, 0.9);
    expect(g.get(goal.id)?.priority).toBe(0.9);
  });

  test('setPriority throws on out of range', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    expect(() => g.setPriority(goal.id, -0.1)).toThrow(GoalError);
    expect(() => g.setPriority(goal.id, 1.1)).toThrow(GoalError);
  });

  test('setPriority throws on unknown id', () => {
    const g = new GoalManager();
    expect(() => g.setPriority('missing', 0.5)).toThrow(GoalError);
  });

  test('all returns all goals', () => {
    const g = new GoalManager();
    g.create('a');
    g.create('b');
    g.create('c');
    expect(g.all()).toHaveLength(3);
  });

  test('delete removes goal', () => {
    const g = new GoalManager();
    const goal = g.create('x');
    expect(g.delete(goal.id)).toBe(true);
    expect(g.get(goal.id)).toBeUndefined();
  });

  test('delete returns false for unknown id', () => {
    const g = new GoalManager();
    expect(g.delete('missing')).toBe(false);
  });
});
