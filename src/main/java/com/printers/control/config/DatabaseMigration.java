package com.printers.control.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

@Component
public class DatabaseMigration implements CommandLineRunner {

    private final DataSource dataSource;

    public DatabaseMigration(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void run(String... args) {
        // Try to convert the enum-like column to VARCHAR so new enum values are accepted.
        // Safe to run multiple times; if it fails we'll catch and log silently to avoid blocking startup.
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            // convert enum-like columns to VARCHAR so new enum values are accepted
            st.execute("ALTER TABLE printers ALTER COLUMN status SET DATA TYPE VARCHAR");
            st.execute("ALTER TABLE printers ALTER COLUMN connectivity_status SET DATA TYPE VARCHAR");
        } catch (SQLException e) {
            // Ignore failures (e.g., already VARCHAR or unsupported syntax). If it fails,
            // the user can run the ALTER manually via H2 console.
            System.err.println("DatabaseMigration: unable to alter printers.status column — " + e.getMessage());
        }

        // Attempt to drop any UNIQUE index on printers.codigo (H2 stores indexes in INFORMATION_SCHEMA)
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "PRINTERS", true, false)) {
                while (rs.next()) {
                    String colName = rs.getString("COLUMN_NAME");
                    String idxName = rs.getString("INDEX_NAME");
                    if (colName != null && colName.equalsIgnoreCase("CODIGO") && idxName != null) {
                        try {
                            st.execute("DROP INDEX " + idxName);
                            System.err.println("DatabaseMigration: dropped index " + idxName + " on printers.codigo");
                        } catch (SQLException ex) {
                            System.err.println("DatabaseMigration: unable to drop index " + idxName + " — " + ex.getMessage());
                        }
                    }
                }
            }
        } catch (SQLException e) {
            // Non-fatal; log and continue
            System.err.println("DatabaseMigration: unable to inspect/drop unique index on printers.codigo — " + e.getMessage());
        }

        // As a last resort, query H2's INFORMATION_SCHEMA for unique constraints on PRINTERS.
        // H2 may expose the unique index as part of a constraint, so dropping the constraint
        // is the correct way to remove the uniqueness restriction.
        try (Connection conn = dataSource.getConnection(); Statement st = conn.createStatement()) {
            String q = "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.CONSTRAINTS WHERE TABLE_NAME='PRINTERS' AND CONSTRAINT_TYPE='UNIQUE'";
            try (java.sql.ResultSet rs = st.executeQuery(q)) {
                while (rs.next()) {
                    String constraintName = rs.getString("CONSTRAINT_NAME");
                    if (constraintName != null && !constraintName.isBlank()) {
                        try {
                            st.execute("ALTER TABLE PRINTERS DROP CONSTRAINT " + constraintName);
                            System.err.println("DatabaseMigration: dropped unique constraint " + constraintName + " on PRINTERS");
                        } catch (SQLException ex) {
                            System.err.println("DatabaseMigration: failed dropping constraint " + constraintName + " — " + ex.getMessage());
                        }
                    }
                }
            }
        } catch (SQLException e) {
            System.err.println("DatabaseMigration: unable to query/drop unique constraints from INFORMATION_SCHEMA — " + e.getMessage());
        }
    }
}
