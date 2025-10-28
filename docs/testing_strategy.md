# StoryArt Location Hierarchy Testing Strategy

## Overview
This document outlines the comprehensive testing strategy for the StoryArt location hierarchy system, ensuring data integrity, performance, and compatibility with the existing StoryTeller database.

## Testing Phases

### Phase 1: Schema Testing
**Objective:** Verify the new schema works correctly without affecting existing data

#### 1.1 Table Creation Testing
- [ ] Verify `storyart_location_hierarchy` table is created successfully
- [ ] Check all columns have correct data types and constraints
- [ ] Verify foreign key relationships to `location_arcs` and `stories`
- [ ] Test unique constraints and check constraints

#### 1.2 Index Testing
- [ ] Verify all indexes are created successfully
- [ ] Test query performance with and without indexes
- [ ] Check index usage with EXPLAIN ANALYZE

#### 1.3 View Testing
- [ ] Verify `storyart_location_hierarchy_view` returns correct data
- [ ] Test view performance with complex queries
- [ ] Verify view updates correctly when underlying tables change

### Phase 2: Function Testing
**Objective:** Ensure all custom functions work correctly

#### 2.1 Hierarchy Functions
- [ ] Test `get_child_locations()` with valid parent ID
- [ ] Test `get_child_locations()` with invalid parent ID
- [ ] Test `get_child_locations()` with NULL parent ID
- [ ] Test `get_parent_location()` with valid child ID
- [ ] Test `get_parent_location()` with invalid child ID
- [ ] Test `get_parent_location()` with root node (no parent)

#### 2.2 Trigger Testing
- [ ] Test `updated_at` trigger fires on UPDATE
- [ ] Verify trigger doesn't fire on INSERT
- [ ] Test trigger with multiple row updates

### Phase 3: Data Integrity Testing
**Objective:** Ensure data consistency and referential integrity

#### 3.1 Foreign Key Testing
- [ ] Test insertion with invalid `location_arc_id`
- [ ] Test insertion with invalid `story_id`
- [ ] Test insertion with invalid `parent_location_id`
- [ ] Test deletion of referenced location_arcs (should fail)

#### 3.2 Constraint Testing
- [ ] Test unique constraint on (location_arc_id, parent_location_id, area_type)
- [ ] Test floor_level constraint (valid range: -10 to 50)
- [ ] Test NOT NULL constraints on required fields

#### 3.3 Circular Reference Testing
- [ ] Test prevention of circular parent-child relationships
- [ ] Test deep hierarchy (multiple levels)
- [ ] Test self-referencing (parent = child)

### Phase 4: Performance Testing
**Objective:** Ensure acceptable performance with large datasets

#### 4.1 Query Performance
- [ ] Test simple SELECT queries (< 100ms)
- [ ] Test complex JOIN queries with hierarchy view
- [ ] Test recursive queries for deep hierarchies
- [ ] Test queries with large result sets

#### 4.2 Index Effectiveness
- [ ] Verify indexes are used in query plans
- [ ] Test performance without indexes (baseline)
- [ ] Test performance with indexes (improvement)
- [ ] Monitor index usage statistics

#### 4.3 Scalability Testing
- [ ] Test with 100 hierarchy records
- [ ] Test with 1,000 hierarchy records
- [ ] Test with 10,000 hierarchy records
- [ ] Monitor memory usage and query times

### Phase 5: Integration Testing
**Objective:** Ensure compatibility with existing StoryTeller system

#### 5.1 StoryTeller Compatibility
- [ ] Verify StoryTeller queries still work
- [ ] Test StoryTeller application functionality
- [ ] Verify no performance degradation in StoryTeller
- [ ] Test StoryTeller data integrity

#### 5.2 StoryArt Integration
- [ ] Test StoryArt application with hierarchy data
- [ ] Verify hierarchy data is accessible to StoryArt
- [ ] Test error handling when hierarchy data unavailable
- [ ] Test fallback to original location_arcs data

### Phase 6: Data Migration Testing
**Objective:** Ensure safe migration of existing data

#### 6.1 NHIA Facility 7 Migration
- [ ] Verify NHIA Facility 7 hierarchy is created correctly
- [ ] Test all child locations (reception, corridors, vault, server room)
- [ ] Verify visual descriptions are accurate
- [ ] Test floor level assignments

#### 6.2 Data Validation
- [ ] Compare hierarchy data with original location_arcs data
- [ ] Verify no data loss during migration
- [ ] Test data consistency across all levels
- [ ] Verify all relationships are maintained

### Phase 7: Error Handling Testing
**Objective:** Ensure robust error handling and recovery

#### 7.1 Database Connection Testing
- [ ] Test behavior when database is unavailable
- [ ] Test connection timeout handling
- [ ] Test connection pool exhaustion
- [ ] Test reconnection after failure

#### 7.2 Data Corruption Testing
- [ ] Test behavior with corrupted hierarchy data
- [ ] Test recovery from partial data corruption
- [ ] Test rollback procedures
- [ ] Test backup restoration

### Phase 8: Security Testing
**Objective:** Ensure data security and access control

#### 8.1 Access Control Testing
- [ ] Test user permissions on hierarchy table
- [ ] Test role-based access control
- [ ] Test SQL injection prevention
- [ ] Test unauthorized access attempts

#### 8.2 Data Privacy Testing
- [ ] Verify sensitive data is not exposed
- [ ] Test data encryption at rest
- [ ] Test data encryption in transit
- [ ] Test audit logging

## Test Data Requirements

### Sample Data Sets
1. **Minimal Dataset:** 1 location with 2 child locations
2. **Medium Dataset:** 5 locations with 3 levels of hierarchy
3. **Large Dataset:** 20 locations with 5 levels of hierarchy
4. **Edge Cases:** NULL values, empty strings, special characters

### Test Scenarios
1. **Normal Operation:** Standard CRUD operations
2. **Error Conditions:** Invalid data, missing references
3. **Performance Stress:** Large datasets, complex queries
4. **Recovery Scenarios:** Rollback, restore, repair

## Test Execution Plan

### Pre-Testing Setup
1. Create test database environment
2. Install monitoring tools
3. Set up automated test scripts
4. Create test data sets

### Test Execution
1. Run automated tests first
2. Execute manual tests for complex scenarios
3. Perform integration tests with live systems
4. Conduct performance benchmarks

### Post-Testing Analysis
1. Analyze test results and metrics
2. Identify performance bottlenecks
3. Document any issues found
4. Create improvement recommendations

## Success Criteria

### Functional Requirements
- [ ] All hierarchy functions work correctly
- [ ] Data integrity is maintained
- [ ] Performance meets requirements (< 100ms for simple queries)
- [ ] StoryTeller compatibility is preserved

### Non-Functional Requirements
- [ ] System handles 10,000+ hierarchy records
- [ ] Queries complete within acceptable time limits
- [ ] Memory usage remains within bounds
- [ ] Error handling is robust and informative

### Quality Metrics
- [ ] 100% test coverage for critical functions
- [ ] Zero data loss during migration
- [ ] Zero performance degradation for StoryTeller
- [ ] All security requirements met

## Test Environment Requirements

### Hardware Requirements
- PostgreSQL 13+ server
- Minimum 8GB RAM
- SSD storage for performance testing
- Network connectivity for integration testing

### Software Requirements
- PostgreSQL client tools
- Database monitoring tools
- Performance testing tools
- Automated testing framework

### Data Requirements
- Copy of production StoryTeller database
- Test data sets of various sizes
- Backup and restore capabilities
- Data anonymization tools

## Risk Mitigation

### Data Protection
- Always test on copies of production data
- Maintain multiple backup copies
- Test rollback procedures thoroughly
- Monitor system resources during testing

### Performance Impact
- Test during low-usage periods
- Monitor system performance continuously
- Have rollback plan ready
- Test with realistic data volumes

### Compatibility Issues
- Test with all supported StoryTeller versions
- Verify all existing queries still work
- Test application integration thoroughly
- Maintain backward compatibility

## Documentation Requirements

### Test Documentation
- [ ] Test case execution results
- [ ] Performance benchmark results
- [ ] Error handling test results
- [ ] Security test results

### Operational Documentation
- [ ] Deployment procedures
- [ ] Monitoring procedures
- [ ] Troubleshooting guides
- [ ] Rollback procedures

### User Documentation
- [ ] Hierarchy system overview
- [ ] Query examples and best practices
- [ ] Performance optimization tips
- [ ] Common issues and solutions
