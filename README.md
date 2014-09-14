These modules form the Drupal part of ecdosis: a system for editing, 
managing and creating digital scholarly editions. The modules are 
designed to work with Drupal 7, but most of their functionality is in 
jQuery javascript. The reason is that, given the extreme frequency that 
Drupal gets updated, this way the modules will more likely work with new 
versions of Drupal. So most of the modules just define themselves, then 
delegate to the Javascript.

To work properly the modules also require mongodb, the Project and MML 
services (available on AustESE-Infrastructure).
