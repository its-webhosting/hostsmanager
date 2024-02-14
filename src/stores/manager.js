import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/tauri";

export const useManager = defineStore("manager", () => {
  const showDialog = ref(false);
  const Hosts = ref([]);
  const OldHosts = ref([]);
  const ChangesSaved = computed(() => {
    return JSON.stringify(Hosts.value) === JSON.stringify(OldHosts.value);
  });

  // Setters
  const SetHosts = (hosts) => {
    Hosts.value = hosts;
    OldHosts.value = hosts;
  };
  const SetHostsFromString = (hosts) => {
    Hosts.value = hosts2array(hosts);
    OldHosts.value = hosts2array(hosts);
  };
  const ShowForm = () => {
    showDialog.value = true;
  };
  const HideForm = () => {
    showDialog.value = false;
  };

  const AddEntry = (entry) => {
    if (entry.edit) {
      Hosts.value[entry.index] = {
        ip: entry.ip,
        host: entry.host,
        active: entry.active,
      };
    } else {
      Hosts.value.push({
        ip: entry.ip,
        host: entry.host,
        active: entry.active,
      });
    }
    HideForm();
  };
  // Open the hosts file in the default editor
  const OpenHosts = () => {
    return new Promise((resolve, reject) => {
      invoke("open_hosts")
        .then(() => {
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  };

  const SaveHosts = () => {
    // Generate the hosts string
    let hosts_string = Hosts.value
      .map((entry) => {
        let result = "";
        if (!entry.active) {
          result += "#N";
        }
        result += entry.ip;
        result += " ";
        result += entry.host;
        return result;
      })
      .join("\n");

    hosts_string =
      "#N Managed by Hosts Manager\n" +
      hosts_string +
      "\n#N End of Hosts Manager\n";

    // Save the Hosts File as Admin
    return new Promise((resolve, reject) => {
      invoke("save_hosts", { hostsString: hosts_string })
        .then(() => {
          OldHosts.value = [...Hosts.value];
          resolve();
        })
        .catch((err) => {
          reject(err);
        });
    });
  };

  // Util Functions
  const hosts2array = (hosts) => {
    const lines = hosts.split("\n");
    const results = [];
    lines.forEach((line) => {
      // Remove comments
      if (line.startsWith("#") && !line.startsWith("#N")) return;

      const result = {
        ip: "",
        hosts: [],
        host: "",
        active: true,
      };

      if (line.startsWith("#N")) {
        result.active = false;
        line = line.substring(2);
      }
      const parts = line.replace("\t", " ").split(" ");
      result.ip = parts[0];

      // If the IP is empty, skip the line
      if (result.ip === "") return;

      // Multiple Hosts, not supported on most systems
      for (let i = 1; i < parts.length; i++) {
        if (parts[i] === "") continue;
        result.hosts.push(parts[i]);
      }
      result.host = result.hosts.join(" ");
      delete result.hosts;
      results.push(result);
    });
    return results;
  };

  return {
    Hosts,
    ChangesSaved,
    // Methods
    AddEntry,
    OpenHosts,
    SaveHosts,
    SetHosts,
    SetHostsFromString,
    // Form Methods
    ShowForm,
    HideForm,
    // Variables
    showDialog,
  };
});
