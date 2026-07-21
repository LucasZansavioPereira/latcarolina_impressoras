import java.sql.*;
public class H2Inspect {
    public static void main(String[] args) throws Exception {
        Class.forName("org.h2.Driver");
        try (Connection c = DriverManager.getConnection("jdbc:h2:file:./data/printers", "sa", "")) {
            printResult(c, "SELECT * FROM INFORMATION_SCHEMA.CONSTRAINTS WHERE TABLE_NAME='PRINTERS'");
            System.out.println("---- INDEXES ----");
            printResult(c, "SELECT * FROM INFORMATION_SCHEMA.INDEXES WHERE TABLE_NAME='PRINTERS'");
        }
    }
    private static void printResult(Connection c, String sql) throws Exception {
        try (Statement st = c.createStatement(); ResultSet rs = st.executeQuery(sql)) {
            ResultSetMetaData md = rs.getMetaData();
            int cols = md.getColumnCount();
            while (rs.next()) {
                for (int i = 1; i <= cols; i++) {
                    System.out.print(md.getColumnLabel(i) + "=" + rs.getString(i) + "; ");
                }
                System.out.println();
            }
        }
    }
}
