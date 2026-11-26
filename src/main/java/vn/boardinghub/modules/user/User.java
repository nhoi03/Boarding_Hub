package vn.boardinghub.modules.user;
import jakarta.persistence.*; import vn.boardinghub.shared.persistence.BaseEntity;
@Entity @Table(name="users") public class User extends BaseEntity {
 @Column(nullable=false,unique=true,length=160) private String email; @Column(nullable=false) private String passwordHash; @Column(nullable=false,length=120) private String fullName; @Column(nullable=false) private boolean active=true;
 protected User(){} public User(String email,String hash,String fullName){this.email=email.toLowerCase().trim();this.passwordHash=hash;this.fullName=fullName;}
 public String getEmail(){return email;} public String getPasswordHash(){return passwordHash;} public String getFullName(){return fullName;} public boolean isActive(){return active;}
}
